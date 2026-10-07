from typing import List, Optional

from pydantic import BaseModel, Field


class AnimeSearchResult(BaseModel):
    anilist_id: int
    title: str
    cover_image: Optional[str] = None
    score: Optional[int] = None
    episodes: Optional[int] = None
    genres: List[str] = Field(default_factory=list)
