import json
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_db
from app.core.config import get_settings
from app.models.anime_entry import AnimeEntry
from app.models.user import User
from app.schemas.anime_ask import AnimeAskRequest, AnimeAskResponse
from app.services.openrouter import OpenRouterClient, OpenRouterError

router = APIRouter(prefix="/api/anime-ask", tags=["anime-ask"])
settings = get_settings()


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
                    parsed.setdefault("answer", raw)
                    return parsed
            except json.JSONDecodeError:
                pass
    elif "```" in cleaned:
        start_fence = cleaned.find("```") + len("```")
        end_fence = cleaned.find("```", start_fence)
        if end_fence != -1:
            try:
                parsed = json.loads(cleaned[start_fence:end_fence].strip())
                if isinstance(parsed, dict):
                    parsed.setdefault("answer", raw)
                    return parsed
            except json.JSONDecodeError:
                pass

    # 2. Direct JSON parse
    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict):
            parsed.setdefault("answer", raw)
            return parsed
    except json.JSONDecodeError:
        pass

    # 3. Locate outermost curly braces
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            parsed = json.loads(cleaned[start : end + 1])
            if isinstance(parsed, dict):
                parsed.setdefault("answer", raw)
                return parsed
        except json.JSONDecodeError:
            pass

    return {"answer": raw}


@router.post("", response_model=AnimeAskResponse)
async def anime_ask(
    payload: AnimeAskRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    current_settings=Depends(get_settings),
) -> AnimeAskResponse:
    if not current_settings.openrouter_api_key:
        raise HTTPException(status_code=503, detail="OpenRouter ist nicht konfiguriert (OPENROUTER_API_KEY fehlt in .env)")

    entries = list((await db.scalars(select(AnimeEntry).where(AnimeEntry.user_id == user.id, AnimeEntry.status != "dismissed"))).all())
    profile = ", ".join(f"{entry.title} ({entry.user_rating or '-'} / 10)" for entry in entries[:20]) or "Keine gespeicherten Anime"
    if payload.mode == "evaluate":
        system = "Bewerte, ob der angegebene Anime zum Nutzer passt. Antworte als JSON mit answer und score (1-10)."
    else:
        system = "Empfehle 3 bis 5 Anime passend zum Nutzer. Antworte als JSON mit answer und recommendations; jede Empfehlung braucht title, score (1-10) und reason."
    messages = [
        {"role": "system", "content": f"{system} Nutzerliste: {profile}"},
        {"role": "user", "content": payload.prompt},
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
    except Exception:
        return AnimeAskResponse(answer=parsed.get("answer") or raw)