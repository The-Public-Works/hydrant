"""Voyage AI embeddings client (async, batched, retrying).

`voyage-3-lite` returns 512-dim vectors and accepts up to 32k input tokens
per item. The free tier is rate-limited (3 RPM) — adding a billing method on
voyageai.com bumps it to 2000 RPM at no cost. The REST `truncation: true`
default lets the server clip overlong inputs, so we don't pre-tokenize.

The two input_type values matter for retrieval quality: pass "document" when
indexing the corpus and "query" when embedding a search string.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Literal, Sequence

import httpx

log = logging.getLogger(__name__)

VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings"
MAX_BATCH_INPUTS = 128


class Embedder:
    def __init__(self, api_key: str, model: str = "voyage-3-lite"):
        self._headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        self._model = model
        self._client = httpx.AsyncClient(timeout=60.0)

    async def aclose(self) -> None:
        await self._client.aclose()

    async def _embed(
        self, texts: Sequence[str], input_type: Literal["document", "query"],
    ) -> list[list[float]]:
        if not texts:
            return []
        out: list[list[float]] = [None] * len(texts)  # type: ignore[list-item]
        for start in range(0, len(texts), MAX_BATCH_INPUTS):
            batch = list(texts[start : start + MAX_BATCH_INPUTS])
            for attempt in range(6):
                try:
                    resp = await self._client.post(
                        VOYAGE_API_URL,
                        headers=self._headers,
                        json={
                            "model": self._model,
                            "input": batch,
                            "input_type": input_type,
                            "truncation": True,
                        },
                    )
                    if resp.status_code == 429:
                        wait = float(resp.headers.get("retry-after", "5"))
                        log.warning("voyage 429, sleeping %.1fs", wait)
                        await asyncio.sleep(min(wait, 60))
                        continue
                    resp.raise_for_status()
                    data = resp.json()["data"]
                    # Voyage returns objects with `index` for ordering
                    data.sort(key=lambda d: d["index"])
                    for i, item in enumerate(data):
                        out[start + i] = item["embedding"]
                    break
                except httpx.HTTPStatusError as e:
                    if attempt == 5:
                        log.error("voyage failed: %s — body=%s", e, e.response.text[:500])
                        raise
                    log.warning("voyage %s on attempt %d", e.response.status_code, attempt + 1)
                    await asyncio.sleep(2**attempt)
                except Exception as e:  # noqa: BLE001
                    if attempt == 5:
                        raise
                    log.warning("voyage error on attempt %d: %s", attempt + 1, e)
                    await asyncio.sleep(2**attempt)
        return out  # type: ignore[return-value]

    async def embed_documents(self, texts: Sequence[str]) -> list[list[float]]:
        return await self._embed(texts, "document")

    async def embed_query(self, text: str) -> list[float]:
        [vec] = await self._embed([text], "query")
        return vec

    # Back-compat helper — used to be the only entrypoint.
    async def embed(self, texts: Sequence[str]) -> list[list[float]]:
        return await self.embed_documents(texts)
