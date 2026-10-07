import asyncio
import logging
import time
from typing import Any, Dict, List, Optional, Set, Tuple

from app.schemas.catalog import AnimeSearchResult
from app.services.anilist import AniListClient

logger = logging.getLogger(__name__)

RECOMMENDATION_QUERY = """
query Recommendations($id: Int!) {
  Media(id: $id, type: ANIME) {
    recommendations(sort: RATING_DESC, perPage: 20) {
      nodes {
        rating
        mediaRecommendation {
          id
          title { userPreferred }
          coverImage { large }
          averageScore
          episodes
          genres
        }
      }
    }
  }
}
"""


class RecommendationCache:
    def __init__(self, ttl_seconds: int = 60 * 60 * 24) -> None:
        self.ttl_seconds = ttl_seconds
        self._items: Dict[Tuple[Any, ...], Tuple[float, List[AnimeSearchResult]]] = {}

    def get(self, key: Tuple[Any, ...]) -> Optional[List[AnimeSearchResult]]:
        item = self._items.get(key)
        if not item:
            return None
        expires_at, value = item
        if expires_at <= time.monotonic():
            del self._items[key]
            return None
        return value

    def set(self, key: Tuple[Any, ...], value: List[AnimeSearchResult]) -> None:
        self._items[key] = (time.monotonic() + self.ttl_seconds, value)


class RecommendationService:
    def __init__(
        self,
        client: AniListClient,
        cache: Optional[RecommendationCache] = None,
        max_concurrency: int = 5,
    ) -> None:
        self.client = client
        self.cache = cache or RecommendationCache()
        self.max_concurrency = max_concurrency

    async def get_recommendations(
        self,
        source_ids: List[int],
        limit: int = 10,
        excluded_ids: Optional[Set[int]] = None,
    ) -> List[AnimeSearchResult]:
        normalized_ids = tuple(sorted(set(source_ids)))
        if not normalized_ids:
            return []

        excluded: Set[int] = set(normalized_ids)
        if excluded_ids:
            excluded.update(excluded_ids)

        key = (normalized_ids, tuple(sorted(excluded)), limit)
        cached = self.cache.get(key)
        if cached is not None:
            return cached
        semaphore = asyncio.Semaphore(self.max_concurrency)
        errors: List[Exception] = []

        async def fetch_nodes(source_id: int) -> List[dict[str, Any]]:
            async with semaphore:
                try:
                    data = await self.client.execute(RECOMMENDATION_QUERY, {"id": source_id})
                    nodes = data.get("Media", {}).get("recommendations", {}).get("nodes", []) or []
                    return list(nodes)
                except Exception as error:
                    logger.warning("Failed to fetch recommendations for anime %s: %s", source_id, error)
                    errors.append(error)
                    return []

        results = await asyncio.gather(*(fetch_nodes(source_id) for source_id in normalized_ids))

        if errors and len(errors) == len(normalized_ids):
            raise errors[0]

        aggregated: Dict[int, Tuple[int, int, AnimeSearchResult]] = {}
        for nodes in results:
            for node in nodes:
                media = node.get("mediaRecommendation") or {}
                media_id = media.get("id")
                if not media_id or media_id in excluded:
                    continue
                result = AnimeSearchResult(
                    anilist_id=media_id,
                    title=media.get("title", {}).get("userPreferred", "Untitled"),
                    cover_image=media.get("coverImage", {}).get("large"),
                    score=media.get("averageScore"),
                    episodes=media.get("episodes"),
                    genres=media.get("genres", []),
                )
                rating = node.get("rating") or 0
                count, best_rating, _ = aggregated.get(media_id, (0, 0, result))
                aggregated[media_id] = (count + 1, max(best_rating, rating), result)

        ranked = sorted(
            aggregated.values(),
            key=lambda item: (item[0], item[1], item[2].score or 0, -item[2].anilist_id),
            reverse=True,
        )
        recommendations = [item[2] for item in ranked[:limit]]
        self.cache.set(key, recommendations)
        return recommendations
