"""Notion ingestion orchestrator.

Run via `python -m indexer notion`.

Phases:
  1. /users/me -> workspace name (used as the source-key namespace)
  2. /search   -> every page + database the integration can see
  3. For each database: /databases/{id}/query -> each row (= page)
  4. For each page: walk /blocks/{id}/children recursively, collect text
  5. Embed page-level text blobs into the chunks table

Idempotent: every node upserts on (type, source_key).

Source-key conventions:
    notion:db:<database_id>
    notion:page:<page_id>

Both database_id and page_id come straight from Notion (UUIDs); no need
to namespace by workspace because the IDs themselves are globally unique.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import asyncpg

from .config import Config
from .db import (
    clear_chunks_for_nodes,
    insert_chunks,
    open_pool,
    upsert_edge,
    upsert_node,
)
from .embedder import Embedder
from .notion_fetcher import (
    Notion,
    NotionRef,
    block_to_text,
    page_title,
    rich_text_plain,
)

log = logging.getLogger(__name__)

# How deep we descend into nested blocks. Notion can nest arbitrarily
# (toggle inside toggle inside toggle …) so we cap to keep the indexer fast.
MAX_BLOCK_DEPTH = 4


@dataclass
class NotionStats:
    workspace: str = ""
    pages: int = 0
    databases: int = 0
    blocks: int = 0
    edges: int = 0
    chunks: int = 0
    skipped_empty: int = 0


# --- key helpers -----------------------------------------------------------


def _page_key(page_id: str) -> str:
    return f"notion:page:{page_id}"


def _db_key(database_id: str) -> str:
    return f"notion:db:{database_id}"


# --- text extraction ------------------------------------------------------


async def _flatten_page_text(
    nt: Notion, page_id: str, *, depth: int = 0,
) -> list[str]:
    """Recursively walk block children, return ordered list of plain-text
    lines. Indented by depth so the embedded text preserves nesting hints
    without being too noisy.
    """
    if depth >= MAX_BLOCK_DEPTH:
        return []
    out: list[str] = []
    indent = "  " * depth
    async for block in nt.block_children(page_id):
        text = block_to_text(block)
        if text:
            for line in text.splitlines():
                out.append(f"{indent}{line}")
        if block.get("has_children") and depth + 1 < MAX_BLOCK_DEPTH:
            child_lines = await _flatten_page_text(
                nt, block["id"], depth=depth + 1,
            )
            out.extend(child_lines)
    return out


# --- ingestion ------------------------------------------------------------


async def _ingest_database(
    conn: asyncpg.Connection, db: dict, ws: NotionRef,
) -> int:
    db_id = db["id"]
    # Database "title" is itself a rich_text array on the db object
    title = rich_text_plain(db.get("title")) or "(untitled database)"
    nid = await upsert_node(
        conn,
        type="notion_database",
        source_key=_db_key(db_id),
        props={
            "id": db_id,
            "title": title,
            "url": db.get("url"),
            "workspace": ws.workspace_name,
            "created_time": db.get("created_time"),
            "last_edited_time": db.get("last_edited_time"),
        },
    )
    return nid


async def _ingest_page(
    conn: asyncpg.Connection,
    nt: Notion,
    page: dict,
    ws: NotionRef,
    db_node_ids: dict[str, int],
    stats: NotionStats,
) -> tuple[int, str] | None:
    """Upsert the page, walk its blocks, return (node_id, body_text) for
    embedding — or None if the page has no extractable text.
    """
    page_id = page["id"]
    title = page_title(page)
    parent = page.get("parent") or {}
    parent_type = parent.get("type")
    parent_id = parent.get("page_id") or parent.get("database_id") or parent.get("workspace") or None

    nid = await upsert_node(
        conn,
        type="notion_page",
        source_key=_page_key(page_id),
        props={
            "id": page_id,
            "title": title,
            "url": page.get("url"),
            "workspace": ws.workspace_name,
            "parent_type": parent_type,
            "parent_id": parent_id,
            "created_time": page.get("created_time"),
            "last_edited_time": page.get("last_edited_time"),
            "archived": page.get("archived", False),
        },
    )
    stats.pages += 1

    # page -> database (row of)
    if parent_type == "database_id":
        db_nid = db_node_ids.get(parent.get("database_id") or "")
        if db_nid:
            await upsert_edge(conn, src=nid, dst=db_nid, type="part_of")

    # Walk blocks for embedable text
    lines = await _flatten_page_text(nt, page_id)
    stats.blocks += len(lines)
    body = "\n".join(lines).strip()
    if not body:
        stats.skipped_empty += 1
        return None

    # Prepend the title so the embedded text starts with it — improves
    # retrieval hits when the query is "find the auth runbook".
    full = f"# {title}\n\n{body}" if title else body
    return (nid, full)


async def _embed_pages(
    conn: asyncpg.Connection,
    embedder: Embedder,
    targets: list[tuple[int, str]],
    stats: NotionStats,
) -> None:
    if not targets:
        return
    await clear_chunks_for_nodes(conn, [t[0] for t in targets])
    BATCH = 64  # smaller batch — Notion pages can be much longer than chat msgs
    for i in range(0, len(targets), BATCH):
        batch = targets[i : i + BATCH]
        vecs = await embedder.embed_documents([t[1] for t in batch])
        rows = [
            (nid, text, vec, {"source": "notion"})
            for (nid, text), vec in zip(batch, vecs, strict=False)
            if vec is not None
        ]
        await insert_chunks(conn, rows)
        stats.chunks += len(rows)
        log.info("embedded %d/%d notion pages", min(i + BATCH, len(targets)), len(targets))


# --- top-level orchestrator ----------------------------------------------


async def index_notion(*, cfg: Config | None = None) -> NotionStats:
    cfg = cfg or Config.load()
    if not cfg.notion_api_key:
        raise RuntimeError(
            "NOTION_API_KEY is not set. Add it to your .env "
            "(see .env.example for the format)."
        )

    pool = await open_pool(cfg.database_url)
    embedder = Embedder(cfg.openai_api_key, cfg.openai_embed_model, cfg.embed_dim)
    stats = NotionStats()

    try:
        async with Notion(cfg.notion_api_key) as nt:
            ws = await nt.workspace_ref()
            stats.workspace = ws.workspace_name
            log.info("indexing notion workspace %s", ws.workspace_name)

            db_node_ids: dict[str, int] = {}
            page_targets: list[tuple[int, str]] = []

            # Step 1: enumerate everything the integration can see.
            # Notion's /search returns pages + databases interleaved, and
            # database rows are NOT included (they only appear in /query).
            async with pool.acquire() as conn:
                async for item in nt.search():
                    obj = item.get("object")
                    async with conn.transaction():
                        if obj == "database":
                            nid = await _ingest_database(conn, item, ws)
                            db_node_ids[item["id"]] = nid
                            stats.databases += 1
                        elif obj == "page":
                            target = await _ingest_page(
                                conn, nt, item, ws, db_node_ids, stats,
                            )
                            if target:
                                page_targets.append(target)

                # Step 2: walk each database and ingest its rows as pages too.
                for db_id, db_nid in list(db_node_ids.items()):
                    async for row in nt.database_query(db_id):
                        async with conn.transaction():
                            target = await _ingest_page(
                                conn, nt, row, ws, db_node_ids, stats,
                            )
                            if target:
                                page_targets.append(target)

                # Step 3: embed all collected pages
                await _embed_pages(conn, embedder, page_targets, stats)

                row = await conn.fetchrow(
                    "SELECT count(*) FROM edges "
                    "WHERE src IN (SELECT id FROM nodes WHERE type IN "
                    "  ('notion_page','notion_database'))"
                )
                stats.edges = int(row["count"])

    finally:
        await embedder.aclose()
        await pool.close()

    log.info("notion done: %s", stats)
    return stats
