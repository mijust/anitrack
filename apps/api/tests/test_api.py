import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.api.dependencies import get_db
from app.main import app
from app.models import Base


@pytest.mark.asyncio
async def test_watchlist_flow() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    async def override_get_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            create = await client.post(
                "/api/anime-entries",
                json={
                    "anilist_id": 101,
                    "title": "Test Anime",
                    "status": "watching",
                    "user_rating": 9,
                    "episodes_watched": 4,
                },
            )
            assert create.status_code == 201
            entry_id = create.json()["id"]

            duplicate = await client.post(
                "/api/anime-entries",
                json={"anilist_id": 101, "title": "Test Anime"},
            )
            assert duplicate.status_code == 409

            filtered = await client.get("/api/anime-entries?status=watching&min_rating=8")
            assert filtered.status_code == 200
            assert [entry["id"] for entry in filtered.json()] == [entry_id]

            update = await client.patch(
                f"/api/anime-entries/{entry_id}",
                json={"status": "completed", "episodes_watched": 12},
            )
            assert update.status_code == 200
            assert update.json()["status"] == "completed"

            # Test dismissed entry
            dismiss = await client.post(
                "/api/anime-entries",
                json={"anilist_id": 999, "title": "Not Interested", "status": "dismissed"},
            )
            assert dismiss.status_code == 201
            assert dismiss.json()["status"] == "dismissed"

            dismissed_list = await client.get("/api/anime-entries?status=dismissed")
            assert dismissed_list.status_code == 200
            assert len(dismissed_list.json()) == 1
    finally:
        app.dependency_overrides.clear()
        await engine.dispose()


def test_extract_preferred_title():
    from app.services.anilist import extract_preferred_title

    # Prefers English if available
    assert extract_preferred_title({
        "english": "Attack on Titan",
        "romaji": "Shingeki no Kyojin",
        "userPreferred": "Shingeki no Kyojin",
    }) == "Attack on Titan"

    # Falls back to userPreferred if english is None or empty
    assert extract_preferred_title({
        "english": None,
        "romaji": "Bocchi the Rock!",
        "userPreferred": "Bocchi the Rock!",
    }) == "Bocchi the Rock!"

    assert extract_preferred_title({
        "english": "   ",
        "romaji": "Solo Leveling",
        "userPreferred": "Ore dake Level Up na Ken",
    }) == "Ore dake Level Up na Ken"

    # Falls back to romaji if userPreferred is missing
    assert extract_preferred_title({
        "english": None,
        "romaji": "Sousou no Frieren",
    }) == "Sousou no Frieren"

    # Empty or None returns Untitled
    assert extract_preferred_title(None) == "Untitled"
    assert extract_preferred_title({}) == "Untitled"

