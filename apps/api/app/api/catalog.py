import re
from typing import Any, List, Optional

from fastapi import APIRouter, HTTPException, Query

from app.core.config import get_settings
from app.schemas.catalog import (
    AnimeDetails,
    AnimeRelation,
    AnimeSearchResult,
    AnimeStudio,
    AnimeTag,
    AnimeTrailer,
    NextAiring,
)
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
      status
      nextAiringEpisode {
        episode
        airingAt
        timeUntilAiring
      }
    }
  }
}
"""

AIRING_QUERY = """
query AiringAnime($ids: [Int], $status: MediaStatus, $perPage: Int!) {
  Page(perPage: $perPage) {
    media(
      id_in: $ids
      type: ANIME
      status: $status
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
      status
      nextAiringEpisode {
        episode
        airingAt
        timeUntilAiring
      }
    }
  }
}
"""

ANIME_DETAILS_QUERY = """
query AnimeDetails($id: Int, $search: String) {
  Media(id: $id, search: $search, type: ANIME) {
    id
    title {
      english
      userPreferred
      romaji
      native
    }
    coverImage {
      extraLarge
      large
    }
    bannerImage
    description(asHtml: false)
    averageScore
    meanScore
    popularity
    favourites
    format
    status
    episodes
    duration
    season
    seasonYear
    startDate {
      year
      month
      day
    }
    endDate {
      year
      month
      day
    }
    genres
    tags {
      name
      rank
      isGeneralSpoiler
      isMediaSpoiler
    }
    studios(isMain: true) {
      nodes {
        id
        name
        isAnimationStudio
      }
    }
    trailer {
      id
      site
      thumbnail
    }
    source
    relations {
      edges {
        relationType
        node {
          id
          type
          format
          status
          episodes
          seasonYear
          title {
            english
            userPreferred
            romaji
          }
          coverImage {
            large
          }
        }
      }
    }
    nextAiringEpisode {
      episode
      airingAt
      timeUntilAiring
    }
  }
}
"""


def format_fuzzy_date(d: Optional[dict[str, Any]]) -> Optional[str]:
    if not d:
        return None
    year = d.get("year")
    month = d.get("month")
    day = d.get("day")
    if not year:
        return None
    if month and day:
        return f"{day:02d}.{month:02d}.{year}"
    if month:
        return f"{month:02d}.{year}"
    return str(year)


def clean_description(raw: Optional[str]) -> Optional[str]:
    if not raw:
        return None
    text = re.sub(r"<[^>]+>", " ", raw)
    text = re.sub(r"\s+", " ", text).strip()
    return text or None


def map_media_results(data: dict[str, Any]) -> List[AnimeSearchResult]:
    results = data.get("Page", {}).get("media", [])
    output: List[AnimeSearchResult] = []
    for item in results:
        next_raw = item.get("nextAiringEpisode")
        next_airing = (
            NextAiring(
                episode=next_raw["episode"],
                airing_at=next_raw["airingAt"],
                time_until_airing=next_raw["timeUntilAiring"],
            )
            if next_raw and "episode" in next_raw
            else None
        )
        output.append(
            AnimeSearchResult(
                anilist_id=item["id"],
                title=extract_preferred_title(item.get("title")),
                cover_image=item.get("coverImage", {}).get("large"),
                score=item.get("averageScore"),
                episodes=item.get("episodes"),
                genres=item.get("genres", []),
                status=item.get("status"),
                next_airing=next_airing,
            )
        )
    return output


@router.get("/search", response_model=list[AnimeSearchResult])
async def search_anime(search: str = Query(min_length=2, max_length=100)) -> list[AnimeSearchResult]:
    try:
        data: dict[str, Any] = await client.execute(SEARCH_QUERY, {"search": search})
    except AniListError as error:
        raise HTTPException(status_code=502, detail="AniList search unavailable") from error

    return map_media_results(data)


@router.get("/details", response_model=AnimeDetails)
async def anime_details(
    id: Optional[int] = Query(default=None, ge=1),
    search: Optional[str] = Query(default=None, min_length=1, max_length=120),
) -> AnimeDetails:
    if not id and not search:
        raise HTTPException(status_code=400, detail="Entweder 'id' oder 'search' muss angegeben werden.")

    variables: dict[str, Any] = {}
    if id is not None:
        variables["id"] = id
    elif search is not None:
        variables["search"] = search

    try:
        data: dict[str, Any] = await client.execute(ANIME_DETAILS_QUERY, variables)
    except AniListError as error:
        raise HTTPException(status_code=502, detail="AniList details unavailable") from error

    media = data.get("Media")
    if not media:
        raise HTTPException(status_code=404, detail="Anime nicht gefunden.")

    studios_raw = media.get("studios", {}).get("nodes", [])
    studios = [
        AnimeStudio(
            id=s.get("id"),
            name=s.get("name", "Unbekannt"),
            is_animation_studio=bool(s.get("isAnimationStudio", True)),
        )
        for s in studios_raw
        if s.get("name")
    ]

    tags_raw = media.get("tags", [])
    tags = [
        AnimeTag(name=t["name"], rank=t.get("rank"))
        for t in tags_raw
        if not t.get("isGeneralSpoiler") and not t.get("isMediaSpoiler") and t.get("name")
    ]
    tags.sort(key=lambda t: t.rank or 0, reverse=True)

    trailer_raw = media.get("trailer")
    trailer = (
        AnimeTrailer(
            id=trailer_raw.get("id"),
            site=trailer_raw.get("site"),
            thumbnail=trailer_raw.get("thumbnail"),
        )
        if trailer_raw and trailer_raw.get("id")
        else None
    )

    next_airing_raw = media.get("nextAiringEpisode")
    next_airing = (
        NextAiring(
            episode=next_airing_raw["episode"],
            airing_at=next_airing_raw["airingAt"],
            time_until_airing=next_airing_raw["timeUntilAiring"],
        )
        if next_airing_raw and "episode" in next_airing_raw
        else None
    )

    relations_raw = media.get("relations", {}).get("edges", [])
    relations: list[AnimeRelation] = []
    for edge in relations_raw:
        node = edge.get("node")
        if not node or node.get("type") != "ANIME":
            continue
        relations.append(
            AnimeRelation(
                id=node["id"],
                relation_type=edge.get("relationType", "OTHER"),
                title=extract_preferred_title(node.get("title")),
                format=node.get("format"),
                status=node.get("status"),
                episodes=node.get("episodes"),
                season_year=node.get("seasonYear"),
                cover_image=node.get("coverImage", {}).get("large"),
            )
        )

    title_obj = media.get("title", {})
    return AnimeDetails(
        anilist_id=media["id"],
        title=extract_preferred_title(title_obj),
        romaji_title=title_obj.get("romaji"),
        native_title=title_obj.get("native"),
        cover_image=media.get("coverImage", {}).get("extraLarge") or media.get("coverImage", {}).get("large"),
        banner_image=media.get("bannerImage"),
        description=clean_description(media.get("description")),
        score=media.get("averageScore"),
        mean_score=media.get("meanScore"),
        popularity=media.get("popularity"),
        favourites=media.get("favourites"),
        format=media.get("format"),
        status=media.get("status"),
        episodes=media.get("episodes"),
        duration=media.get("duration"),
        season=media.get("season"),
        season_year=media.get("seasonYear"),
        start_date=format_fuzzy_date(media.get("startDate")),
        end_date=format_fuzzy_date(media.get("endDate")),
        genres=media.get("genres", []),
        tags=tags[:15],
        studios=studios,
        trailer=trailer,
        source=media.get("source"),
        next_airing=next_airing,
        relations=relations,
    )


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


@router.get("/airing", response_model=List[AnimeSearchResult])
async def airing_anime(
    ids: Optional[List[int]] = Query(default=None),
    per_page: int = Query(default=30, ge=1, le=50),
) -> List[AnimeSearchResult]:
    variables: dict[str, Any] = {
        "perPage": len(ids) if ids else per_page,
    }
    if ids and len(ids) > 0:
        variables["ids"] = ids
    else:
        variables["status"] = "RELEASING"

    try:
        data = await client.execute(AIRING_QUERY, variables)
    except AniListError as error:
        raise HTTPException(status_code=502, detail="AniList airing data unavailable") from error
    return map_media_results(data)

