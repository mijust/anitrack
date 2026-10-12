from __future__ import annotations

from typing import Any, Optional
from urllib.parse import quote_plus

import httpx


class WerStreamtClient:
    def __init__(
        self,
        base_url: str,
        timeout: float = 10.0,
        client: Optional[httpx.AsyncClient] = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
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

    def build_filter_url(self, title: str) -> str:
        return f"{self.base_url}/filme-serien/?q={quote_plus(title.strip())}"

    def build_widget_url(self, title: str) -> str:
        filter_url = quote_plus(self.build_filter_url(title))
        return (
            f"{self.base_url}/widgets/filter/embed/"
            f"?filterUrl={filter_url}&hideEntryWithoutProvider=true&limit=1&showNumbers=false&style=single"
        )

    async def fetch_providers(self) -> list[dict[str, Any]]:
        response = await self._get_client().get(f"{self.base_url}/widgets/filter/providers/?v=2")
        response.raise_for_status()
        payload = response.json()
        if isinstance(payload, list):
            return [item for item in payload if isinstance(item, dict)]
        return []
