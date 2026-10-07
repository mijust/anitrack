import pytest

from app.schemas.catalog import AnimeSearchResult
from app.services.recommendations import RecommendationCache, RecommendationService


class FakeAniListClient:
    def __init__(self) -> None:
        self.calls = []

    async def execute(self, query: str, variables: dict) -> dict:
        self.calls.append(variables["id"])
        return {
            "Media": {
                "recommendations": {
                    "nodes": [
                        {"rating": 90, "mediaRecommendation": {"id": 2, "title": {"userPreferred": "Shared"}, "averageScore": 85, "genres": []}},
                        {"rating": 80, "mediaRecommendation": {"id": 3, "title": {"userPreferred": "Second"}, "averageScore": 92, "genres": []}},
                        {"rating": 70, "mediaRecommendation": {"id": 1, "title": {"userPreferred": "Already listed"}, "averageScore": 100, "genres": []}},
                    ]
                }
            }
        }


@pytest.mark.asyncio
async def test_recommendations_dedupe_exclude_and_cache() -> None:
    client = FakeAniListClient()
    service = RecommendationService(client, RecommendationCache(ttl_seconds=3600))

    first = await service.get_recommendations([1, 4], limit=10)
    second = await service.get_recommendations([4, 1], limit=10)

    assert [item.anilist_id for item in first] == [2, 3]
    assert [item.anilist_id for item in second] == [2, 3]
    assert client.calls == [1, 4]


@pytest.mark.asyncio
async def test_recommendation_cache_expires() -> None:
    client = FakeAniListClient()
    service = RecommendationService(client, RecommendationCache(ttl_seconds=0))

    await service.get_recommendations([1], limit=5)
    await service.get_recommendations([1], limit=5)

    assert client.calls == [1, 1]


@pytest.mark.asyncio
async def test_recommendations_partial_failure_continues() -> None:
    class FailingAniListClient:
        async def execute(self, query: str, variables: dict) -> dict:
            if variables["id"] == 1:
                raise RuntimeError("AniList timeout on anime 1")
            return {
                "Media": {
                    "recommendations": {
                        "nodes": [
                            {"rating": 90, "mediaRecommendation": {"id": 2, "title": {"userPreferred": "Shared"}, "averageScore": 85, "genres": []}},
                        ]
                    }
                }
            }

    service = RecommendationService(FailingAniListClient(), RecommendationCache(ttl_seconds=3600))
    result = await service.get_recommendations([1, 4], limit=10)

    # Anime 4 recommendations should still be returned despite anime 1 failing
    assert len(result) == 1
    assert result[0].anilist_id == 2


@pytest.mark.asyncio
async def test_recommendations_all_fail_raises() -> None:
    class AlwaysFailingClient:
        async def execute(self, query: str, variables: dict) -> dict:
            raise RuntimeError("AniList down")

    service = RecommendationService(AlwaysFailingClient(), RecommendationCache(ttl_seconds=3600))
    with pytest.raises(RuntimeError, match="AniList down"):
        await service.get_recommendations([1, 2], limit=10)

