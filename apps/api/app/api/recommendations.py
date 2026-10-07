from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_db
from app.core.config import get_settings
from app.models.anime_entry import AnimeEntry
from app.models.user import User
from app.schemas.catalog import AnimeSearchResult
from app.services.anilist import AniListClient
from app.services.recommendations import RecommendationService

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])
settings = get_settings()
service = RecommendationService(AniListClient(settings.anilist_api_url))


@router.get("", response_model=List[AnimeSearchResult])
async def recommendations(
    limit: int = Query(default=10, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> List[AnimeSearchResult]:
    entries = list((await db.scalars(select(AnimeEntry).where(AnimeEntry.user_id == user.id))).all())
    source_ids = [entry.anilist_id for entry in entries if entry.status != "dismissed"]
    all_excluded = {entry.anilist_id for entry in entries}
    return await service.get_recommendations(source_ids, limit, excluded_ids=all_excluded)
