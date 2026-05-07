"""Linear ingestion orchestrator.

Run via `python -m indexer linear [--teams ENG OPS ...]`.

Phases:
  1. viewer + organization -> workspace ref (urlKey)
  2. List teams (optionally filtered to --teams)
  3. List issues for those teams
  4. List comments for those issues
  5. Embed (issue title + description) and (comment body) into chunks

Idempotent: every node upserts on (type, source_key).

Source-key conventions:
    linear:<org>:team:<team_id>
    linear:<org>:issue:<issue_id>           (also stores `identifier` like ENG-123 in props)
    linear:<org>:comment:<comment_id>
    linear:user:<user_id>                   (workspace-scoped under the author type)
"""

from __future__ import annotations

import logging
import re
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
from .linear_fetcher import Linear, WorkspaceRef

log = logging.getLogger(__name__)

# Linear issue refs in markdown look like ENG-123 or OPS-9. We use this to
# detect cross-issue mentions inside descriptions and comment bodies.
ISSUE_REF_RE = re.compile(r"\b([A-Z][A-Z0-9]+)-(\d+)\b")


@dataclass
class LinearStats:
    workspace: str = ""
    teams: int = 0
    issues: int = 0
    comments: int = 0
    users: int = 0
    edges: int = 0
    chunks: int = 0
    skipped_empty: int = 0


# --- key helpers -----------------------------------------------------------


def _team_key(ws: WorkspaceRef, team_id: str) -> str:
    return f"linear:{ws.org_url_key}:team:{team_id}"


def _issue_key(ws: WorkspaceRef, issue_id: str) -> str:
    return f"linear:{ws.org_url_key}:issue:{issue_id}"


def _comment_key(ws: WorkspaceRef, comment_id: str) -> str:
    return f"linear:{ws.org_url_key}:comment:{comment_id}"


# --- ingestion -------------------------------------------------------------


async def _ensure_user(
    conn: asyncpg.Connection,
    cache: dict[str, int],
    user: dict | None,
    ws: WorkspaceRef,
) -> int | None:
    """Upsert a Linear user as an `author` node (shared with GitHub +
    Slack) so existing graph queries that walk `authored_by` work.
    """
    if not user or not user.get("id"):
        return None
    uid = user["id"]
    if uid in cache:
        return cache[uid]
    name = user.get("displayName") or user.get("name") or uid
    nid = await upsert_node(
        conn,
        type="author",
        source_key=f"linear:{uid}",
        props={
            "login": name,
            "linear_id": uid,
            "linear_org": ws.org_url_key,
            "email": user.get("email"),
            "html_url": user.get("url"),
        },
    )
    cache[uid] = nid
    return nid


async def _ingest_team(
    conn: asyncpg.Connection, team: dict, ws: WorkspaceRef,
) -> int:
    return await upsert_node(
        conn,
        type="linear_team",
        source_key=_team_key(ws, team["id"]),
        props={
            "id": team["id"],
            "key": team.get("key"),
            "name": team.get("name"),
            "description": team.get("description"),
            "org": ws.org_url_key,
        },
    )


async def _ingest_issue(
    conn: asyncpg.Connection,
    issue: dict,
    ws: WorkspaceRef,
    team_node_ids: dict[str, int],
    issue_id_by_identifier: dict[str, int],
    user_cache: dict[str, int],
    stats: LinearStats,
) -> tuple[int, str] | None:
    """Upsert an issue, register graph edges, return embedding target."""
    iid = issue["id"]
    title = issue.get("title") or ""
    desc = issue.get("description") or ""

    nid = await upsert_node(
        conn,
        type="linear_issue",
        source_key=_issue_key(ws, iid),
        props={
            "id": iid,
            "identifier": issue.get("identifier"),
            "title": title,
            "description": desc,
            "url": issue.get("url"),
            "priority": issue.get("priority"),
            "state": (issue.get("state") or {}).get("name"),
            "state_type": (issue.get("state") or {}).get("type"),
            "team_key": (issue.get("team") or {}).get("key"),
            "team_id": (issue.get("team") or {}).get("id"),
            "created_at": issue.get("createdAt"),
            "completed_at": issue.get("completedAt"),
            "labels": [
                (l or {}).get("name")
                for l in (issue.get("labels") or {}).get("nodes", [])
            ],
        },
    )
    stats.issues += 1
    if issue.get("identifier"):
        issue_id_by_identifier[issue["identifier"]] = nid

    # issue -> team
    team_id = (issue.get("team") or {}).get("id")
    if team_id and team_id in team_node_ids:
        await upsert_edge(conn, src=nid, dst=team_node_ids[team_id], type="part_of")

    # issue -> creator (authored_by) and -> assignee (assigned_to)
    creator_nid = await _ensure_user(conn, user_cache, issue.get("creator"), ws)
    if creator_nid is not None:
        await upsert_edge(conn, src=nid, dst=creator_nid, type="authored_by")
    assignee_nid = await _ensure_user(conn, user_cache, issue.get("assignee"), ws)
    if assignee_nid is not None:
        await upsert_edge(conn, src=nid, dst=assignee_nid, type="assigned_to")

    text = f"{title}\n\n{desc}".strip()
    if not text:
        stats.skipped_empty += 1
        return None
    return (nid, text)


async def _ingest_comment(
    conn: asyncpg.Connection,
    comment: dict,
    ws: WorkspaceRef,
    issue_id_by_identifier: dict[str, int],
    user_cache: dict[str, int],
    stats: LinearStats,
) -> tuple[int, str] | None:
    cid = comment["id"]
    body = (comment.get("body") or "").strip()
    if not body:
        stats.skipped_empty += 1
        return None
    issue_ref = comment.get("issue") or {}
    issue_identifier = issue_ref.get("identifier")

    nid = await upsert_node(
        conn,
        type="linear_comment",
        source_key=_comment_key(ws, cid),
        props={
            "id": cid,
            "body": body,
            "url": comment.get("url"),
            "issue_identifier": issue_identifier,
            "issue_id": issue_ref.get("id"),
            "created_at": comment.get("createdAt"),
            "org": ws.org_url_key,
        },
    )
    stats.comments += 1

    # comment -> issue (on)
    if issue_identifier and issue_identifier in issue_id_by_identifier:
        await upsert_edge(
            conn, src=nid, dst=issue_id_by_identifier[issue_identifier], type="on",
        )

    # comment -> author
    author_nid = await _ensure_user(conn, user_cache, comment.get("user"), ws)
    if author_nid is not None:
        await upsert_edge(conn, src=nid, dst=author_nid, type="authored_by")

    # mentions: ENG-123 references inside the body
    for m in ISSUE_REF_RE.finditer(body):
        ident = f"{m.group(1)}-{m.group(2)}"
        target_nid = issue_id_by_identifier.get(ident)
        if target_nid is not None and target_nid != nid:
            await upsert_edge(conn, src=nid, dst=target_nid, type="mentions")

    return (nid, body)


# --- embedding ------------------------------------------------------------


async def _embed_targets(
    conn: asyncpg.Connection,
    embedder: Embedder,
    targets: list[tuple[int, str, str]],
    stats: LinearStats,
) -> None:
    """`targets` = list of (node_id, text, source_label) where source_label
    is "issue" or "comment" — stored in chunk meta for later filtering.
    """
    if not targets:
        return
    await clear_chunks_for_nodes(conn, [t[0] for t in targets])
    BATCH = 128
    for i in range(0, len(targets), BATCH):
        batch = targets[i : i + BATCH]
        vecs = await embedder.embed_documents([t[1] for t in batch])
        rows = [
            (nid, text, vec, {"source": "linear", "kind": kind})
            for (nid, text, kind), vec in zip(batch, vecs, strict=False)
            if vec is not None
        ]
        await insert_chunks(conn, rows)
        stats.chunks += len(rows)
        log.info("embedded %d/%d linear items", min(i + BATCH, len(targets)), len(targets))


# --- top-level orchestrator ----------------------------------------------


async def index_linear(
    *,
    team_keys: list[str] | None = None,
    cfg: Config | None = None,
) -> LinearStats:
    cfg = cfg or Config.load()
    if not cfg.linear_api_key:
        raise RuntimeError(
            "LINEAR_API_KEY is not set. Add it to your .env "
            "(see .env.example for the format)."
        )

    pool = await open_pool(cfg.database_url)
    embedder = Embedder(cfg.voyage_api_key, cfg.voyage_model)
    stats = LinearStats()

    try:
        async with Linear(cfg.linear_api_key) as ln:
            ws = await ln.workspace_ref()
            stats.workspace = ws.org_url_key
            log.info(
                "indexing linear org %s%s",
                ws.org_url_key,
                f", teams={team_keys}" if team_keys else "",
            )

            team_node_ids: dict[str, int] = {}
            issue_id_by_identifier: dict[str, int] = {}
            user_cache: dict[str, int] = {}
            embed_targets: list[tuple[int, str, str]] = []  # (nid, text, kind)

            async with pool.acquire() as conn:
                # Teams
                async with conn.transaction():
                    async for team in ln.teams():
                        if team_keys and team.get("key") not in team_keys:
                            continue
                        nid = await _ingest_team(conn, team, ws)
                        team_node_ids[team["id"]] = nid
                        stats.teams += 1

                # Issues
                async for issue in ln.issues(team_keys=team_keys):
                    async with conn.transaction():
                        target = await _ingest_issue(
                            conn, issue, ws, team_node_ids,
                            issue_id_by_identifier, user_cache, stats,
                        )
                        if target:
                            embed_targets.append((target[0], target[1], "issue"))

                # Comments
                async for comment in ln.comments(team_keys=team_keys):
                    async with conn.transaction():
                        target = await _ingest_comment(
                            conn, comment, ws, issue_id_by_identifier,
                            user_cache, stats,
                        )
                        if target:
                            embed_targets.append((target[0], target[1], "comment"))

                stats.users = len(user_cache)

                # Embed outside transactions for durability of partial progress
                await _embed_targets(conn, embedder, embed_targets, stats)

                row = await conn.fetchrow(
                    "SELECT count(*) FROM edges "
                    "WHERE src IN (SELECT id FROM nodes WHERE type IN "
                    "  ('linear_issue','linear_comment','linear_team'))"
                )
                stats.edges = int(row["count"])

    finally:
        await embedder.aclose()
        await pool.close()

    log.info("linear done: %s", stats)
    return stats
