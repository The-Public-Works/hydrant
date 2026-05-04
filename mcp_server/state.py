"""Shared server-wide state: DB pool + embedding client.

Set up once in __main__ and reused by all tool handlers.
"""

from __future__ import annotations

import asyncpg

from indexer.config import Config
from indexer.db import open_pool
from indexer.embedder import Embedder


class ServerState:
    def __init__(self) -> None:
        self.cfg: Config | None = None
        self.pool: asyncpg.Pool | None = None
        self.embedder: Embedder | None = None

    async def startup(self) -> None:
        self.cfg = Config.load()
        self.pool = await open_pool(self.cfg.database_url)
        self.embedder = Embedder(self.cfg.voyage_api_key, self.cfg.voyage_model)

    async def shutdown(self) -> None:
        if self.embedder:
            await self.embedder.aclose()
        if self.pool:
            await self.pool.close()


STATE = ServerState()
