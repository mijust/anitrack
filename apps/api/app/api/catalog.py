from typing import Any, List, Optional

from fastapi import APIRouter, HTTPException, Query

from app.core.config import get_settings
from app.schemas.catalog import AnimeSearchResult
from app.services.anilist import AniListClient, AniListError, extract_preferred_title

router = APIRouter(prefix="/api/catalog", tags=["catalog"])
settings = get_settings()
client = AniListClient(settings.anilist_api_url)

SEARCH_QUERY = """
query SearchAnime($search: String!) {
  Page(perPage: 12) {
    media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
      id
      title {
        english
        userPreferred
        romaji
      }
      coverImage { large }
      averageScore
      episodes
      genres
    }
  }
}
"""

SEASONAL_QUERY = """
query SeasonalAnime(
  $season: MediaSeason!
  $year: Int!
  $genres: [String]
  $format: MediaFormat
  $status: MediaStatus
  $minScore: Int
  $perPage: Int!
) {
  Page(perPage: $perPage) {
    media(
      season: $season
      seasonYear: $year
      type: ANIME
      genre_in: $genres
      format: $format
      status: $status
      averageScore_greater: $minScore
      sort: POPULARITY_DESC
    ) {
      id
      title {
        english
        userPreferred
        romaji
      }
      coverImage { large }
      averageScore
      episodes
      genres
    }
  }
}
"""


def map_media_results(data: dict[str, Any]) -> List[AnimeSearchResult]:
    results = data.get("Page", {}).get("media", [])
    return [
        AnimeSearchResult(
            anilist_id=item["id"],
            title=extract_preferred_title(item.get("title")),
            cover_image=item.get("coverImage", {}).get("large"),
            score=item.get("averageScore"),
            episodes=item.get("episodes"),
            genres=item.get("genres", []),
        )
        for item in results
    ]


@router.get("/search", response_model=list[AnimeSearchResult])
async def search_anime(search: str = Query(min_length=2, max_length=100)) -> list[AnimeSearchResult]:
    try:
        data: dict[str, Any] = await client.execute(SEARCH_QUERY, {"search": search})
    except AniListError as error:
        raise HTTPException(status_code=502, detail="AniList search unavailable") from error

    return map_media_results(data)


@router.get("/seasonal", response_model=List[AnimeSearchResult])
async def seasonal_anime(
    season: str = Query(pattern="^(WINTER|SPRING|SUMMER|FALL)$"),
    year: int = Query(ge=2020, le=2030),
    genre: Optional[str] = Query(default=None, max_length=50),
    format: Optional[str] = Query(default=None, pattern="^(TV|TV_SHORT|MOVIE|SPECIAL|OVA|ONA|MUSIC)$"),
    status: Optional[str] = Query(default=None, pattern="^(FINISHED|RELEASING|NOT_YET_RELEASED|CANCELLED|HIATUS)$"),
    min_score: Optional[int] = Query(default=None, ge=0, le=100),
    per_page: int = Query(default=24, ge=1, le=50),
    ) -> List[AnimeSearchResult]:
    variables: dict[str, Any] = {
        "season": season,
        "year": year,
        "perPage": per_page,
    }
    if genre:
        variables["genres"] = [genre]
    if format:
        variables["format"] = format
    if status:
        variables["status"] = status
    if min_score is not None:
        variables["minScore"] = min_score

    try:
        data = await client.execute(SEASONAL_QUERY, variables)
    except AniListError as error:
        raise HTTPException(status_code=502, detail="AniList seasonal data unavailable") from error
    return map_media_results(data)
