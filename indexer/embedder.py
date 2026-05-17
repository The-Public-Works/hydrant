"""OpenAI embeddings client (async, batched, retrying).

Uses `text-embedding-3-*` models, which support the `dimensions` request
parameter so we can pick a sub-native size to keep vectors compact (Matryoshka
truncation). The DB's `chunks.embedding` column dim must match `EMBED_DIM`;
changing it requires `make db-reset` + a re-index.

Note: `text-embedding-ada-002` does NOT support `dimensions` and is not
supported by this client.
"""

from __future__ import annotations

import asyncio
import logging
import os
from typing import Sequence

import httpx

log = logging.getLogger(__name__)

OPENAI_API_URL = "https://api.openai.com/v1/embeddings"
MAX_BATCH_INPUTS = 128
# text-embedding-3-* accepts <=8192 tokens per input. Cap by chars (free to
# measure); 20k chars ≈ 6.6k tokens even at the worst-case ~3 chars/token
# ratio for dense code. Override via env for pathological inputs.
MAX_INPUT_CHARS = int(os.getenv("INDEXER_EMBED_MAX_CHARS", "20000"))


def _truncate(text: str) -> str:
    if len(text) <= MAX_INPUT_CHARS:
        return text
    log.warning(
        "truncating embedding input from %d to %d chars",
        len(text), MAX_INPUT_CHARS,
    )
    return text[:MAX_INPUT_CHARS]


class Embedder:
    def __init__(self, api_key: str, model: str = "text-embedding-3-small", dim: int = 1536):
        self._headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        self._model = model
        self._dim = dim
        self._client = httpx.AsyncClient(timeout=60.0)

    async def aclose(self) -> None:
        await self._client.aclose()

    async def _embed(self, texts: Sequence[str]) -> list[list[float]]:
        if not texts:
            return []
        out: list[list[float]] = [None] * len(texts)  # type: ignore[list-item]
        for start in range(0, len(texts), MAX_BATCH_INPUTS):
            batch = [_truncate(t) for t in texts[start : start + MAX_BATCH_INPUTS]]
            for attempt in range(6):
                try:
                    resp = await self._client.post(
                        OPENAI_API_URL,
                        headers=self._headers,
                        json={
                            "model": self._model,
                            "input": batch,
                            "dimensions": self._dim,
                            "encoding_format": "float",
                        },
                    )
                    if resp.status_code == 429:
                        wait = float(resp.headers.get("retry-after", "5"))
                        log.warning("openai 429, sleeping %.1fs", wait)
                        await asyncio.sleep(min(wait, 60))
                        continue
                    resp.raise_for_status()
                    data = resp.json()["data"]
                    data.sort(key=lambda d: d["index"])
                    for i, item in enumerate(data):
                        out[start + i] = item["embedding"]
                    break
                except httpx.HTTPStatusError as e:
                    code = e.response.status_code
                    # 4xx (other than 429, handled above) won't recover with retries.
                    if 400 <= code < 500 and code != 429:
                        log.error("openai %d (non-retryable): %s",
                                  code, e.response.text[:500])
                        raise
                    if attempt == 5:
                        log.error("openai failed: %s — body=%s", e, e.response.text[:500])
                        raise
                    log.warning("openai %s on attempt %d", code, attempt + 1)
                    await asyncio.sleep(2**attempt)
                except Exception as e:  # noqa: BLE001
                    if attempt == 5:
                        raise
                    log.warning("openai error on attempt %d: %s", attempt + 1, e)
                    await asyncio.sleep(2**attempt)
        return out  # type: ignore[return-value]

    async def embed_documents(self, texts: Sequence[str]) -> list[list[float]]:
        return await self._embed(texts)

    async def embed_query(self, text: str) -> list[float]:
        [vec] = await self._embed([text])
        return vec

    async def embed(self, texts: Sequence[str]) -> list[list[float]]:
        return await self.embed_documents(texts)
