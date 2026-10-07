import pytest
from httpx import ASGITransport, AsyncClient
from pydantic import SecretStr

from app.api import anime_ask, catalog
from app.api.dependencies import get_current_user
from app.main import app
from app.models.user import User


@pytest.mark.asyncio
async def test_seasonal_catalog_maps_filters(monkeypatch: pytest.MonkeyPatch) -> None:
    captured = {}

    async def fake_execute(query: str, variables: dict) -> dict:
        captured.update(variables)
        return {"Page": {"media": [{
            "id": 1,
            "title": {"userPreferred": "Season Anime"},
            "coverImage": {"large": "https://s4.anilist.co/cover.jpg"},
            "averageScore": 88,
            "episodes": 12,
            "genres": ["Fantasy"],
        }]}}

    monkeypatch.setattr(catalog.client, "execute", fake_execute)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/catalog/seasonal?season=WINTER&year=2026&genre=Fantasy&min_score=80")

    assert response.status_code == 200
    assert response.json()[0]["title"] == "Season Anime"
    assert captured["genres"] == ["Fantasy"]
    assert captured["minScore"] == 80


@pytest.mark.asyncio
async def test_anime_ask_requires_openrouter_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(anime_ask.settings, "openrouter_api_key", None)
    app.dependency_overrides[get_current_user] = lambda: User(id=1, username="tester", password_hash="hash")
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/api/anime-ask", json={"mode": "recommend", "prompt": "Fantasy anime"})
        assert response.status_code == 503
    finally:
        app.dependency_overrides.clear()


def test_anime_ask_parses_json_fallback() -> None:
    parsed = anime_ask.parse_llm_response('```json\n{"recommendations": []}\n```')
    assert parsed["recommendations"] == []
    assert "answer" in parsed


def test_anime_ask_parses_surrounded_json_and_floats() -> None:
    raw = 'Hier ist die Antwort:\n```json\n{"answer": "Toll", "score": 8.5, "recommendations": [{"title": "Death Note", "score": 9.5, "reason": "Spannend"}]}\n```\nViel Spass!'
    parsed = anime_ask.parse_llm_response(raw)
    response = anime_ask.AnimeAskResponse.model_validate(parsed)
    assert response.score == 8.5
    assert len(response.recommendations) == 1
    assert response.recommendations[0].score == 9.5
