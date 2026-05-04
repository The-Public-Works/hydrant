"""Async DB helpers shared by indexer and mcp_server.

Two responsibilities:
  1. Open an asyncpg pool + register pgvector codecs.
  2. Provide upsert helpers for nodes/edges/chunks so the indexer is idempotent.
"""

from __future__ import annotations

import json
from typing import Any, Iterable, Sequence

import asyncpg
from pgvector.asyncpg import register_vector


async def open_pool(database_url: str, min_size: int = 1, max_size: int = 8) -> asyncpg.Pool:
    async def _init(conn: asyncpg.Connection) -> None:
        await register_vector(conn)
        # asyncpg returns JSONB as str by default; decode to dict so callers
        # don't need to json.loads everywhere.
        await conn.set_type_codec(
            "jsonb",
            encoder=json.dumps,
            decoder=json.loads,
            schema="pg_catalog",
        )

    return await asyncpg.create_pool(
        dsn=database_url,
        min_size=min_size,
        max_size=max_size,
        init=_init,
    )


async def upsert_node(
    conn: asyncpg.Connection,
    *,
    type: str,
    source_key: str,
    props: dict[str, Any] | None = None,
) -> int:
    row = await conn.fetchrow(
        """
        INSERT INTO nodes (type, source_key, props)
        VALUES ($1, $2, $3::jsonb)
        ON CONFLICT (type, source_key) DO UPDATE
          SET props = EXCLUDED.props
        RETURNING id
        """,
        type,
        source_key,
        props or {},
    )
    return int(row["id"])


async def upsert_edge(
    conn: asyncpg.Connection,
    *,
    src: int,
    dst: int,
    type: str,
    props: dict[str, Any] | None = None,
) -> None:
    await conn.execute(
        """
        INSERT INTO edges (src, dst, type, props)
        VALUES ($1, $2, $3, $4::jsonb)
        ON CONFLICT (src, dst, type) DO UPDATE
          SET props = EXCLUDED.props
        """,
        src,
        dst,
        type,
        props or {},
    )


async def insert_chunks(
    conn: asyncpg.Connection,
    rows: Sequence[tuple[int, str, list[float], dict[str, Any]]],
) -> None:
    """rows = [(node_id, text, embedding, meta), ...]."""
    if not rows:
        return
    await conn.executemany(
        """
        INSERT INTO chunks (node_id, text, embedding, meta)
        VALUES ($1, $2, $3, $4::jsonb)
        """,
        rows,
    )


async def clear_chunks_for_nodes(conn: asyncpg.Connection, node_ids: Iterable[int]) -> None:
    ids = list(node_ids)
    if not ids:
        return
    await conn.execute("DELETE FROM chunks WHERE node_id = ANY($1::bigint[])", ids)
