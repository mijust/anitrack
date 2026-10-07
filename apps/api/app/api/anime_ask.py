import json
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_db
from app.core.config import get_settings
from app.models.anime_entry import AnimeEntry
from app.models.user import User
from app.schemas.anime_ask import AnimeAskRequest, AnimeAskResponse, AnimeEvaluation
from app.services.openrouter import OpenRouterClient, OpenRouterError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/anime-ask", tags=["anime-ask"])
settings = get_settings()

DEFAULT_TOPICS = [
    # Beliebte Haupt-Genres
    {"id": "action", "label": "Action", "category": "genre"},
    {"id": "adventure", "label": "Abenteuer", "category": "genre"},
    {"id": "comedy", "label": "Comedy", "category": "genre"},
    {"id": "drama", "label": "Drama", "category": "genre"},
    {"id": "fantasy", "label": "Fantasy", "category": "genre"},
    {"id": "scifi", "label": "Sci-Fi", "category": "genre"},
    {"id": "mystery", "label": "Mystery", "category": "genre"},
    {"id": "psychological", "label": "Psychological", "category": "genre"},
    {"id": "romance", "label": "Romance", "category": "genre"},
    {"id": "slice-of-life", "label": "Slice of Life", "category": "genre"},
    {"id": "thriller", "label": "Thriller", "category": "genre"},
    {"id": "horror", "label": "Horror", "category": "genre"},
    {"id": "sports", "label": "Sports", "category": "genre"},
    {"id": "supernatural", "label": "Supernatural", "category": "genre"},
    # Beliebte Themes & Tropes
    {"id": "cyberpunk", "label": "Cyberpunk", "category": "theme"},
    {"id": "dark-fantasy", "label": "Dark Fantasy", "category": "theme"},
    {"id": "mind-games", "label": "Mind Games & Psychoduelle", "category": "theme"},
    {"id": "time-travel", "label": "Zeitreisen", "category": "theme"},
    {"id": "isekai", "label": "Isekai", "category": "theme"},
    {"id": "shonen", "label": "Shōnen", "category": "theme"},
    {"id": "seinen", "label": "Seinen (Erwachsen)", "category": "theme"},
    {"id": "dystopia", "label": "Dystopie", "category": "theme"},
    {"id": "detective", "label": "Detektiv & Crime", "category": "theme"},
    {"id": "post-apocalyptic", "label": "Postapokalypse", "category": "theme"},
    {"id": "anti-hero", "label": "Antihelden", "category": "theme"},
    {"id": "magic", "label": "Magiesystem", "category": "theme"},
    {"id": "mecha", "label": "Mecha & Roboter", "category": "theme"},
]


def normalize_parsed_dict(parsed: Dict[str, Any], raw: str) -> Dict[str, Any]:
    # Falls das LLM evaluation-Felder flach abgelegt hat
    eval_keys = {
        "title",
        "synopsis",
        "story_quality",
        "animation_quality",
        "ecchi_level",
        "violence_level",
        "content_notes",
        "match_reason",
        "verdict",
    }
    if "evaluation" not in parsed or not isinstance(parsed.get("evaluation"), dict):
        sub_eval = {k: parsed[k] for k in eval_keys if k in parsed and isinstance(parsed[k], str)}
        if sub_eval:
            parsed["evaluation"] = sub_eval

    # Falls evaluation existiert, prüfen wir auf Title/Score
    if isinstance(parsed.get("evaluation"), dict):
        eval_dict = parsed["evaluation"]
        if "score" in eval_dict and "score" not in parsed:
            parsed["score"] = eval_dict["score"]

    # Score bereinigen
    if "score" in parsed and parsed["score"] is not None:
        try:
            parsed["score"] = float(parsed["score"])
        except (ValueError, TypeError):
            parsed["score"] = None

    parsed.setdefault("answer", raw)
    return parsed


def parse_llm_response(raw: str) -> Dict[str, Any]:
    cleaned = raw.strip()

    # 1. Look for ```json ... ``` code fence
    if "```json" in cleaned:
        start_fence = cleaned.find("```json") + len("```json")
        end_fence = cleaned.find("```", start_fence)
        if end_fence != -1:
            try:
                parsed = json.loads(cleaned[start_fence:end_fence].strip())
                if isinstance(parsed, dict):
                    return normalize_parsed_dict(parsed, raw)
            except json.JSONDecodeError:
                pass
    elif "```" in cleaned:
        start_fence = cleaned.find("```") + len("```")
        end_fence = cleaned.find("```", start_fence)
        if end_fence != -1:
            try:
                parsed = json.loads(cleaned[start_fence:end_fence].strip())
                if isinstance(parsed, dict):
                    return normalize_parsed_dict(parsed, raw)
            except json.JSONDecodeError:
                pass

    # 2. Direct JSON parse
    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict):
            return normalize_parsed_dict(parsed, raw)
    except json.JSONDecodeError:
        pass

    # 3. Locate outermost curly braces
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            parsed = json.loads(cleaned[start : end + 1])
            if isinstance(parsed, dict):
                return normalize_parsed_dict(parsed, raw)
        except json.JSONDecodeError:
            pass

    return {"answer": raw}


def build_user_context(
    entries: List[AnimeEntry],
    dismissed: List[AnimeEntry],
    favorite_topics: List[str],
) -> str:
    lines: List[str] = []
    if favorite_topics:
        lines.append(f"Bevorzugte Genres/Themen des Nutzers: {', '.join(favorite_topics)}")

    # Favoriten (hohe Wertungen >= 7)
    rated_high = [e for e in entries if (e.user_rating or 0) >= 7]
    rated_high.sort(key=lambda e: e.user_rating or 0, reverse=True)
    if rated_high:
        lines.append("Lieblings-Anime des Nutzers (hoch bewertet): " + ", ".join(f"{e.title} ({e.user_rating}/10)" for e in rated_high[:15]))

    # Eher unbeliebte Anime (Wertungen <= 5)
    rated_low = [e for e in entries if e.user_rating and e.user_rating <= 5]
    if rated_low:
        lines.append("Niedrig bewertete / enttäuschende Anime: " + ", ".join(f"{e.title} ({e.user_rating}/10)" for e in rated_low[:8]))

    # Aktuell am Schauen
    watching = [e for e in entries if e.status == "watching"]
    if watching:
        lines.append("Schaut der Nutzer aktuell: " + ", ".join(e.title for e in watching[:8]))

    # Auf der Watchlist
    planned = [e for e in entries if e.status == "planned"]
    if planned:
        lines.append("Auf der Watchlist gemerkt: " + ", ".join(e.title for e in planned[:8]))

    # Ausgeblendete Anime
    if dismissed:
        lines.append("Ausgeblendet / Kein Interesse: " + ", ".join(e.title for e in dismissed[:10]))

    if not lines:
        return "Bisher keine Seh-Historie und keine spezifischen Präferenzen hinterlegt."
    return "\n".join(lines)


@router.get("/topics")
async def get_curated_topics():
    """Gibt kuratierte Genres und Themen für persönliche Präferenzen zurück."""
    return {"topics": DEFAULT_TOPICS}


@router.post("", response_model=AnimeAskResponse)
async def anime_ask(
    payload: AnimeAskRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    current_settings=Depends(get_settings),
) -> AnimeAskResponse:
    if not current_settings.openrouter_api_key:
        raise HTTPException(status_code=503, detail="OpenRouter ist nicht konfiguriert (OPENROUTER_API_KEY fehlt in .env)")

    # Alle aktiven und ignorierten Einträge für Kontext laden
    all_entries = list((await db.scalars(select(AnimeEntry).where(AnimeEntry.user_id == user.id))).all())
    active_entries = [e for e in all_entries if e.status != "dismissed"]
    dismissed_entries = [e for e in all_entries if e.status == "dismissed"]

    user_context = build_user_context(active_entries, dismissed_entries, payload.favorite_topics)

    if payload.mode == "evaluate":
        anime_name = payload.anime_title or payload.prompt
        system = (
            "Du bist ein renommierter, deutschsprachiger Anime-Kritiker und persönlicher Berater. "
            "Bewerte den angefragten Anime für den Nutzer objektiv und persönlich. "
            "Antworte IMMER als valides JSON nach folgendem Schema:\n"
            "{\n"
            '  "answer": "Prägnante deutsche Zusammenfassung und Gesamtfazit für den Nutzer.",\n'
            '  "score": 8.5,\n'
            '  "evaluation": {\n'
            '    "title": "Bekannter internationaler/deutscher Anime-Titel",\n'
            '    "synopsis": "Worum geht es? (2-3 Sätze, packend beschrieben, STRENG SPOILERFREI!)",\n'
            '    "story_quality": "Einschätzung zu Story, Pacing & Community-Konsens (z. B. Genialer Plot, packende Wendungen oder eher seicht)",\n'
            '    "animation_quality": "Studio & Animationsqualität (z. B. Herausragende Animationen von Studio MAPPA, flüssige Kämpfe)",\n'
            '    "ecchi_level": "z. B. Kein Fanservice | Wenig / Dezent | Moderat | Sehr hoch / Viel Ecchi",\n'
            '    "violence_level": "z. B. Gewaltfrei / Harmlos | Typische Action | Düster & Blutig | Extrem / Gore",\n'
            '    "content_notes": "Kurze Erläuterung zu Ecchi/Fanservice, Gewaltgrad und Zielgruppenempfehlung",\n'
            '    "match_reason": "Detaillierte Begründung, warum dieser Anime zum Nutzer passt (oder nicht): Nenne konkrete Titel aus seiner Historie (z.B. Da du X mit 9/10 mochtest...) und gehe auf seine gewählten Themen/Genres ein!",\n'
            '    "verdict": "Kurzes abschließendes Fazit (z. B. Absoluter Pflicht-Watch für dich!)"\n'
            "  }\n"
            "}\n\n"
            "WICHTIG:\n"
            "- Achte zwingend auf SPOILERFREIHEIT in der Handlungsbeschreibung.\n"
            "- Untersuche explizit den Ecchi- und Gewalt-Grad, damit der Nutzer weiß, worauf er sich einlässt.\n"
            "- Verwende stets geläufige deutsche/englische Titel (z. B. Attack on Titan statt Shingeki no Kyojin, Demon Slayer statt Kimetsu no Yaiba)."
        )
        user_message = f"Zu bewertender Anime: {anime_name}\n\nBenutzerprofil & Sehgewohnheiten:\n{user_context}"
    else:
        system = (
            "Du bist ein renommierter, deutschsprachiger Anime-Experte. "
            "Empfehle 3 bis 5 passende Anime für den Nutzer auf Deutsch als valides JSON nach folgendem Schema:\n"
            "{\n"
            '  "answer": "Einleitende Worte zu den Empfehlungen.",\n'
            '  "recommendations": [\n'
            '    {"title": "Deutscher/Englischer Titel", "score": 9.0, "reason": "Warum dieser Anime perfekt zu den Vorlieben und hoch bewerteten Anime des Nutzers passt."}\n'
            "  ]\n"
            "}\n\n"
            "Regeln:\n"
            "- Berücksichtige die hoch bewerteten Lieblings-Anime des Nutzers und seine gewählten Topics.\n"
            "- Schlage KEINE Anime vor, die der Nutzer bereits gesehen oder als 'Kein Interesse' markiert hat.\n"
            "- Verwende stets bekannte deutsche/englische Titel."
        )
        user_message = f"Nutzerwunsch: {payload.prompt}\n\nBenutzerprofil & Sehgewohnheiten:\n{user_context}"

    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user_message},
    ]

    client = OpenRouterClient(
        current_settings.openrouter_api_url,
        current_settings.openrouter_api_key.get_secret_value(),
        current_settings.openrouter_model,
    )
    try:
        async with client:
            raw = await client.chat(messages)
    except OpenRouterError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error

    parsed = parse_llm_response(raw)
    try:
        return AnimeAskResponse.model_validate(parsed)
    except Exception as err:
        logger.warning("Konnte Modell nicht vollständig validieren (%s), Fallback auf answer.", err)
        return AnimeAskResponse(answer=parsed.get("answer") or raw)