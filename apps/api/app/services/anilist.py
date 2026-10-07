import logging
from typing import Any, Optional

import httpx

logger = logging.getLogger(__name__)


class AniListError(RuntimeError):
    """Raised when AniList rejects a GraphQL request."""


class AniListClient:
    def __init__(
        self,
        api_url: str,
        timeout: float = 10.0,
        client: Optional[httpx.AsyncClient] = None,
    ) -> None:
        self.api_url = api_url
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

    async def __aenter__(self) -> "AniListClient":
        return self

    async def __aexit__(self, *args: object) -> None:
        await self.close()

    async def execute(
        self,
        query: str,
        variables: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        payload = {"query": query, "variables": variables or {}}
        client = self._get_client()
        try:
            response = await client.post(self.api_url, json=payload)
            response.raise_for_status()
        except httpx.HTTPError as error:
            raise AniListError("AniList request failed") from error

        try:
            body = response.json()
        except Exception as error:
            raise AniListError("AniList returned invalid JSON") from error

        if body.get("errors"):
            logger.warning("AniList GraphQL error response: %s", body.get("errors"))
            raise AniListError("AniList returned GraphQL errors")
        return body.get("data", {})

