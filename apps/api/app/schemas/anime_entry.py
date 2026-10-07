from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

AnimeStatus = Literal["watching", "completed", "planned", "paused", "dropped"]


class AnimeEntryCreate(BaseModel):
    anilist_id: int = Field(gt=0)
    title: str = Field(min_length=1, max_length=255)
    cover_image: Optional[str] = Field(default=None, max_length=500)
    user_rating: Optional[int] = Field(default=None, ge=1, le=10)
    status: AnimeStatus = "planned"
    episodes_watched: int = Field(default=0, ge=0)
    notes: Optional[str] = None


class AnimeEntryUpdate(BaseModel):
    user_rating: Optional[int] = Field(default=None, ge=1, le=10)
    status: Optional[AnimeStatus] = None
    episodes_watched: Optional[int] = Field(default=None, ge=0)
    notes: Optional[str] = None


class AnimeEntryRead(AnimeEntryCreate):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
