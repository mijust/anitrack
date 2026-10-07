from typing import List, Optional

from pydantic import BaseModel, Field


class NextAiring(BaseModel):
    episode: int
    airing_at: int
    time_until_airing: int


class AnimeSearchResult(BaseModel):
    anilist_id: int
    title: str
    cover_image: Optional[str] = None
    score: Optional[int] = None
    episodes: Optional[int] = None
    genres: List[str] = Field(default_factory=list)
    status: Optional[str] = None
    next_airing: Optional[NextAiring] = None


class AnimeStudio(BaseModel):
    id: Optional[int] = None
    name: str
    is_animation_studio: bool = True


class AnimeTrailer(BaseModel):
    id: Optional[str] = None
    site: Optional[str] = None
    thumbnail: Optional[str] = None


class AnimeTag(BaseModel):
    name: str
    rank: Optional[int] = None


class AnimeRelation(BaseModel):
    id: int
    relation_type: str
    title: str
    format: Optional[str] = None
    status: Optional[str] = None
    episodes: Optional[int] = None
    season_year: Optional[int] = None
    cover_image: Optional[str] = None


class AnimeDetails(BaseModel):
    anilist_id: int
    title: str
    romaji_title: Optional[str] = None
    native_title: Optional[str] = None
    cover_image: Optional[str] = None
    banner_image: Optional[str] = None
    description: Optional[str] = None
    score: Optional[int] = None
    mean_score: Optional[int] = None
    popularity: Optional[int] = None
    favourites: Optional[int] = None
    format: Optional[str] = None
    status: Optional[str] = None
    episodes: Optional[int] = None
    duration: Optional[int] = None
    season: Optional[str] = None
    season_year: Optional[int] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    genres: List[str] = Field(default_factory=list)
    tags: List[AnimeTag] = Field(default_factory=list)
    studios: List[AnimeStudio] = Field(default_factory=list)
    trailer: Optional[AnimeTrailer] = None
    source: Optional[str] = None
    next_airing: Optional[NextAiring] = None
    relations: List[AnimeRelation] = Field(default_factory=list)

