from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_db
from app.models.anime_entry import AnimeEntry
from app.models.user import User
from app.schemas.anime_entry import AnimeEntryCreate, AnimeEntryRead, AnimeEntryUpdate, AnimeStatus

router = APIRouter(prefix="/api/anime-entries", tags=["anime-entries"])


@router.get("", response_model=list[AnimeEntryRead])
async def list_entries(
    status_filter: Optional[AnimeStatus] = Query(default=None, alias="status"),
    min_rating: Optional[int] = Query(default=None, ge=1, le=10),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[AnimeEntry]:
    query = select(AnimeEntry).where(AnimeEntry.user_id == user.id).order_by(AnimeEntry.updated_at.desc())
    if status_filter:
        query = query.where(AnimeEntry.status == status_filter)
    if min_rating is not None:
        query = query.where(AnimeEntry.user_rating >= min_rating)
    return list((await db.scalars(query)).all())


@router.post("", response_model=AnimeEntryRead, status_code=status.HTTP_201_CREATED)
async def create_entry(
    payload: AnimeEntryCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AnimeEntry:
    existing = await db.scalar(
        select(AnimeEntry).where(
            AnimeEntry.user_id == user.id,
            AnimeEntry.anilist_id == payload.anilist_id,
        )
    )
    if existing:
        raise HTTPException(status_code=409, detail="Anime already exists in your list")

    entry = AnimeEntry(user_id=user.id, **payload.model_dump())
    db.add(entry)
    try:
        await db.commit()
    except IntegrityError as error:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Anime already exists in your list") from error
    await db.refresh(entry)
    return entry


@router.patch("/{entry_id}", response_model=AnimeEntryRead)
async def update_entry(
    entry_id: int,
    payload: AnimeEntryUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AnimeEntry:
    entry = await db.scalar(
        select(AnimeEntry).where(AnimeEntry.id == entry_id, AnimeEntry.user_id == user.id)
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Anime entry not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(entry, field, value)
    await db.commit()
    await db.refresh(entry)
    return entry


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_entry(
    entry_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    entry = await db.scalar(
        select(AnimeEntry).where(AnimeEntry.id == entry_id, AnimeEntry.user_id == user.id)
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Anime entry not found")
    await db.delete(entry)
    await db.commit()
