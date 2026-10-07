import logging
from typing import Any, Optional

import httpx

logger = logging.getLogger(__name__)


class OpenRouterError(RuntimeError):
    """Raised when OpenRouter cannot complete a request."""


class OpenRouterClient:
    def __init__(
        self,
        api_url: str,
        api_key: str,
        model: str,
        timeout: float = 30.0,
        client: Optional[httpx.AsyncClient] = None,
    ) -> None:
        self.api_url = api_url
        self.api_key = api_key
        self.model = model
        self.timeout = timeout
        self._external_client = client
        self._internal_client: Optional[httpx.AsyncClient] = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._external_client is not None:
            return self._external_client
        if self._internal_client is None:
            self._internal_client = httpx.AsyncClient(timeout=self.timeout)
        return self._internal_client

    async def close(self) -> None:
        if self._internal_client is not None:
            aclose = getattr(self._internal_client, "aclose", None)
            if callable(aclose):
                await aclose()
            self._internal_client = None

    async def __aenter__(self) -> "OpenRouterClient":
        return self

    async def __aexit__(self, *args: object) -> None:
        await self.close()

    async def chat(self, messages: list[dict[str, str]]) -> str:
        payload: dict[str, Any] = {"model": self.model, "messages": messages}
        headers = {"Authorization": f"Bearer {self.api_key}"}
        client = self._get_client()
        try:
            response = await client.post(self.api_url, json=payload, headers=headers)
            response.raise_for_status()
        except httpx.HTTPError as error:
            raise OpenRouterError(f"OpenRouter request failed: {error}") from error

        try:
            return response.json()["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as error:
            raise OpenRouterError("OpenRouter returned an invalid response") from error

