import pytest

from app.services.anilist import AniListClient
from app.services.openrouter import OpenRouterClient
from app.services.werstreamt import WerStreamtClient


class FakeResponse:
    def __init__(self, payload: dict) -> None:
        self.payload = payload

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict:
        return self.payload


class FakeAsyncClient:
    response_payload: dict = {}
    last_request: dict = {}

    def __init__(self, **_: object) -> None:
        pass

    async def __aenter__(self) -> "FakeAsyncClient":
        return self

    async def __aexit__(self, *_: object) -> None:
        return None

    async def post(self, url: str, **kwargs: object) -> FakeResponse:
        type(self).last_request = {"url": url, **kwargs}
        return FakeResponse(self.response_payload)

    async def get(self, url: str, **kwargs: object) -> FakeResponse:
        type(self).last_request = {"url": url, **kwargs}
        return FakeResponse(self.response_payload)


@pytest.mark.asyncio
async def test_anilist_client_sends_graphql_payload(monkeypatch: pytest.MonkeyPatch) -> None:
    FakeAsyncClient.response_payload = {"data": {"Media": {"id": 123}}}
    monkeypatch.setattr("httpx.AsyncClient", FakeAsyncClient)
    client = AniListClient("https://example.test/graphql")

    result = await client.execute("query ($id: Int) { Media(id: $id) { id } }", {"id": 42})

    assert result == {"Media": {"id": 123}}
    assert FakeAsyncClient.last_request["url"] == "https://example.test/graphql"
    assert FakeAsyncClient.last_request["json"] == {
        "query": "query ($id: Int) { Media(id: $id) { id } }",
        "variables": {"id": 42},
    }


@pytest.mark.asyncio
async def test_openrouter_client_extracts_message(monkeypatch: pytest.MonkeyPatch) -> None:
    FakeAsyncClient.response_payload = {"choices": [{"message": {"content": "Use this anime"}}]}
    monkeypatch.setattr("httpx.AsyncClient", FakeAsyncClient)
    client = OpenRouterClient("https://example.test/chat", "test-key", "test-model")

    result = await client.chat([{"role": "user", "content": "Recommend something"}])

    assert result == "Use this anime"
    assert FakeAsyncClient.last_request["headers"] == {"Authorization": "Bearer test-key"}
    assert FakeAsyncClient.last_request["json"] == {
        "model": "test-model",
        "messages": [{"role": "user", "content": "Recommend something"}],
    }


@pytest.mark.asyncio
async def test_openrouter_client_supports_fallback_models(monkeypatch: pytest.MonkeyPatch) -> None:
    FakeAsyncClient.response_payload = {"choices": [{"message": {"content": "Use fallback"}}]}
    monkeypatch.setattr("httpx.AsyncClient", FakeAsyncClient)
    client = OpenRouterClient("https://example.test/chat", "test-key", "model-a, model-b")

    result = await client.chat([{"role": "user", "content": "Hello"}])

    assert result == "Use fallback"
    assert FakeAsyncClient.last_request["json"] == {
        "models": ["model-a", "model-b"],
        "messages": [{"role": "user", "content": "Hello"}],
    }


@pytest.mark.asyncio
async def test_werstreamt_client_builds_widget_and_loads_providers(monkeypatch: pytest.MonkeyPatch) -> None:
    FakeAsyncClient.response_payload = [{"id": 1, "name": "Netflix", "logo": "https://example.test/netflix.svg"}]
    monkeypatch.setattr("httpx.AsyncClient", FakeAsyncClient)
    client = WerStreamtClient("https://www.werstreamt.es")

    providers = await client.fetch_providers()

    assert providers == [{"id": 1, "name": "Netflix", "logo": "https://example.test/netflix.svg"}]
    assert FakeAsyncClient.last_request["url"] == "https://www.werstreamt.es/widgets/filter/providers/?v=2"
    assert client.build_filter_url("One Piece") == "https://www.werstreamt.es/filme-serien/?q=One+Piece"
    assert "widgets/filter/embed/" in client.build_widget_url("One Piece")
