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
    if cleaned.startswith("```"):
        cleaned = cleaned.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                parsed = json.loads(cleaned[start : end + 1])
            except json.JSONDecodeError:
                return {"answer": raw}
        else:
            return {"answer": raw}

    if not isinstance(parsed, dict):
        return {"answer": raw}
    parsed.setdefault("answer", raw)
    return parsed


@router.post("", response_model=AnimeAskResponse)
async def anime_ask(
    payload: AnimeAskRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AnimeAskResponse:
    if not settings.openrouter_api_key:
        raise HTTPException(status_code=503, detail="OpenRouter is not configured")

    entries = list((await db.scalars(select(AnimeEntry).where(AnimeEntry.user_id == user.id))).all())
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
        settings.openrouter_api_url,
        settings.openrouter_api_key.get_secret_value(),
        settings.openrouter_model,
    )
    try:
        async with client:
            raw = await client.chat(messages)
    except OpenRouterError as error:
        raise HTTPException(status_code=502, detail="OpenRouter unavailable") from error

    parsed = parse_llm_response(raw)
    return AnimeAskResponse.model_validate(parsed)