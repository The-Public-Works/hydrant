"""Slack ingestion orchestrator.

Run via `python -m indexer slack [--channels 'incident-*' [...]]`.

Phases:
  1. auth.test → workspace ref (team_id, domain)
  2. List channels matching the optional glob filters
  3. For each channel: pull history; for any message with thread_ts,
     pull thread replies
  4. Resolve user_id -> user profile (cached)
  5. Embed each message body into the chunks table

Each phase upserts on (type, source_key) so re-running is idempotent.

Source-key conventions (mirrors github):
    slack:<team_id>:channel:<channel_id>
    slack:<team_id>:msg:<channel_id>:<ts>
    slack:<team_id>:user:<user_id>      (also tagged as type=author so
                                         existing graph queries that walk
                                         author edges still work)
"""

from __future__ import annotations

import asyncio
import logging
import re
from dataclasses import dataclass, field
from typing import Any

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
from .slack_fetcher import Slack, SlackError, WorkspaceRef

log = logging.getLogger(__name__)

# Slack mentions look like <@U01ABCD2EF> in raw message text.
USER_MENTION_RE = re.compile(r"<@([UW][A-Z0-9]+)>")


# --- stats -----------------------------------------------------------------


@dataclass
class SlackStats:
    workspace: str = ""
    channels: int = 0
    messages: int = 0
    threads: int = 0
    users: int = 0
    edges: int = 0
    chunks: int = 0
    skipped_empty: int = 0
    skipped_not_member: int = 0


# --- key helpers (kept parallel to run.py for readability) ----------------


def _channel_key(ws: WorkspaceRef, channel_id: str) -> str:
    return f"slack:{ws.team_id}:channel:{channel_id}"


def _msg_key(ws: WorkspaceRef, channel_id: str, ts: str) -> str:
    return f"slack:{ws.team_id}:msg:{channel_id}:{ts}"


def _user_key(ws: WorkspaceRef, user_id: str) -> str:
    return f"slack:{ws.team_id}:user:{user_id}"


def _permalink(ws: WorkspaceRef, channel_id: str, ts: str) -> str:
    """Reconstruct the deep-link without a separate API call.

    Slack permalinks look like
        https://<team_domain>.slack.com/archives/<channel_id>/p<ts_no_dot>
    where the `p` prefix is followed by the message ts with the dot stripped.
    """
    return f"https://{ws.team_domain}.slack.com/archives/{channel_id}/p{ts.replace('.', '')}"


# --- ingestion -------------------------------------------------------------


async def _ensure_user(
    conn: asyncpg.Connection,
    sl: Slack,
    ws: WorkspaceRef,
    cache: dict[str, int],
    user_id: str | None,
) -> int | None:
    """Look up a user, upsert as both `slack_user` (workspace-scoped) and
    `author` (graph-shared). Returns the author node_id so that the existing
    `authored_by` edge convention works for both GitHub and Slack data.
    """
    if not user_id:
        return None
    if user_id in cache:
        return cache[user_id]

    profile = await sl.user_info(user_id)
    name = (
        (profile or {}).get("real_name")
        or (profile or {}).get("name")
        or user_id
    )
    is_bot = bool((profile or {}).get("is_bot"))

    # Author node — shared with GitHub data so queries don't have to special-case.
    # We use `slack:<id>` as the source_key so it can't collide with GitHub authors.
    author_nid = await upsert_node(
        conn,
        type="author",
        source_key=f"slack:{user_id}",
        props={
            "login": name,
            "slack_id": user_id,
            "team_id": ws.team_id,
            "is_bot": is_bot,
            "html_url": (profile or {}).get("profile", {}).get("real_name_normalized")
            and f"https://{ws.team_domain}.slack.com/team/{user_id}"
            or None,
        },
    )
    cache[user_id] = author_nid
    return author_nid


async def _ingest_channel(
    conn: asyncpg.Connection,
    sl: Slack,
    ws: WorkspaceRef,
    channel: dict,
    user_cache: dict[str, int],
    stats: SlackStats,
) -> list[tuple[int, str]]:
    """Ingest one channel + all its messages + thread replies.

    Returns a list of (message_node_id, text) tuples for downstream embedding.
    """
    channel_id = channel["id"]
    channel_name = channel.get("name", channel_id)

    # Slack returns is_member=False for public channels the bot hasn't been
    # invited to. We can still upsert the channel node (so users see it
    # exists) but skip history — calling conversations.history without
    # membership returns `not_in_channel` and aborts the whole ingestion.
    is_member = bool(channel.get("is_member", False))

    chan_nid = await upsert_node(
        conn,
        type="slack_channel",
        source_key=_channel_key(ws, channel_id),
        props={
            "id": channel_id,
            "name": channel_name,
            "topic": (channel.get("topic") or {}).get("value"),
            "purpose": (channel.get("purpose") or {}).get("value"),
            "is_archived": channel.get("is_archived", False),
            "is_member": is_member,
            "num_members": channel.get("num_members"),
        },
    )
    stats.channels += 1

    if not is_member:
        log.warning(
            "channel #%s — bot is not a member, skipping history. "
            "Invite the bot to ingest it: /invite @<bot> in that channel.",
            channel_name,
        )
        stats.skipped_not_member += 1
        return []

    embed_targets: list[tuple[int, str]] = []
    seen_ts: set[str] = set()

    async def upsert_message(msg: dict) -> int | None:
        """Upsert one message node + its edges. Skips empty/system messages."""
        ts = msg.get("ts")
        if not ts:
            return None
        # Skip channel-join, bot-add, etc — they're noise for retrieval.
        if msg.get("subtype") in ("channel_join", "channel_leave", "channel_topic"):
            stats.skipped_empty += 1
            return None
        text = (msg.get("text") or "").strip()
        if not text:
            stats.skipped_empty += 1
            return None

        nid = await upsert_node(
            conn,
            type="slack_message",
            source_key=_msg_key(ws, channel_id, ts),
            props={
                "ts": ts,
                "channel_id": channel_id,
                "channel_name": channel_name,
                "user": msg.get("user"),
                "text": text,
                "thread_ts": msg.get("thread_ts"),
                "reply_count": msg.get("reply_count", 0),
                "html_url": _permalink(ws, channel_id, ts),
                "team_id": ws.team_id,
            },
        )
        stats.messages += 1

        # message -> channel
        await upsert_edge(conn, src=nid, dst=chan_nid, type="posted_in")

        # message -> author (shared `author` node type, so existing tools work)
        author_nid = await _ensure_user(conn, sl, ws, user_cache, msg.get("user"))
        if author_nid is not None:
            await upsert_edge(conn, src=nid, dst=author_nid, type="authored_by")

        # mentions: <@USERID> in the text
        for m in USER_MENTION_RE.finditer(text):
            mentioned_nid = await _ensure_user(conn, sl, ws, user_cache, m.group(1))
            if mentioned_nid is not None and mentioned_nid != author_nid:
                await upsert_edge(conn, src=nid, dst=mentioned_nid, type="mentions")

        embed_targets.append((nid, text))
        return nid

    # Top-level messages
    thread_parents: list[str] = []
    async for msg in sl.history(channel_id):
        await upsert_message(msg)
        seen_ts.add(msg.get("ts", ""))
        # If this is a thread parent, queue it for replies fetch
        if msg.get("thread_ts") == msg.get("ts") and (msg.get("reply_count") or 0) > 0:
            thread_parents.append(msg["ts"])

    # Thread replies
    for parent_ts in thread_parents:
        stats.threads += 1
        parent_db_key = _msg_key(ws, channel_id, parent_ts)
        parent_row = await conn.fetchrow(
            "SELECT id FROM nodes WHERE type='slack_message' AND source_key=$1",
            parent_db_key,
        )
        parent_nid = int(parent_row["id"]) if parent_row else None

        async for reply in sl.replies(channel_id, parent_ts):
            ts = reply.get("ts")
            if not ts or ts in seen_ts:
                continue  # skip the parent that history already returned
            seen_ts.add(ts)
            reply_nid = await upsert_message(reply)
            if reply_nid is not None and parent_nid is not None and reply_nid != parent_nid:
                await upsert_edge(
                    conn, src=reply_nid, dst=parent_nid, type="replied_to",
                )

    log.info(
        "channel #%s: %d messages, %d threads",
        channel_name, stats.messages, stats.threads,
    )
    return embed_targets


# --- embedding -------------------------------------------------------------


async def _embed_messages(
    conn: asyncpg.Connection,
    embedder: Embedder,
    targets: list[tuple[int, str]],
    stats: SlackStats,
) -> None:
    if not targets:
        return

    # Wipe prior chunks for these nodes so re-indexing doesn't duplicate.
    await clear_chunks_for_nodes(conn, [t[0] for t in targets])

    BATCH = 128
    for i in range(0, len(targets), BATCH):
        batch = targets[i : i + BATCH]
        vecs = await embedder.embed_documents([t[1] for t in batch])
        rows = [
            (nid, text, vec, {"source": "slack"})
            for (nid, text), vec in zip(batch, vecs, strict=False)
            if vec is not None
        ]
        await insert_chunks(conn, rows)
        stats.chunks += len(rows)
        log.info("embedded %d/%d slack messages", min(i + BATCH, len(targets)), len(targets))


# --- top-level orchestrator ------------------------------------------------


async def index_slack(
    *,
    channels: list[str] | None = None,
    cfg: Config | None = None,
) -> SlackStats:
    cfg = cfg or Config.load()
    if not cfg.slack_bot_token:
        raise RuntimeError(
            "SLACK_BOT_TOKEN is not set. Add it to your .env "
            "(see .env.example for the format)."
        )

    pool = await open_pool(cfg.database_url)
    embedder = Embedder(cfg.openai_api_key, cfg.openai_embed_model, cfg.embed_dim)
    stats = SlackStats()

    try:
        async with Slack(cfg.slack_bot_token) as sl:
            ws = await sl.workspace_ref()
            stats.workspace = ws.team_domain or ws.team_id
            log.info(
                "indexing slack workspace %s (%s)%s",
                ws.team_domain, ws.team_id,
                f", channels matching {channels}" if channels else "",
            )

            async with pool.acquire() as conn:
                user_cache: dict[str, int] = {}
                all_targets: list[tuple[int, str]] = []

                async for channel in sl.channels(match=channels):
                    try:
                        async with conn.transaction():
                            targets = await _ingest_channel(
                                conn, sl, ws, channel, user_cache, stats,
                            )
                        all_targets.extend(targets)
                    except SlackError as e:
                        # Most likely not_in_channel for a private channel
                        # the bot can list but not read. Log and keep going.
                        log.warning(
                            "channel #%s — slack error (%s), skipping",
                            channel.get("name", channel.get("id")), e.code,
                        )
                        continue

                stats.users = len(user_cache)

                # Embed outside the transaction so partial progress is durable.
                await _embed_messages(conn, embedder, all_targets, stats)

                row = await conn.fetchrow(
                    "SELECT count(*) FROM edges "
                    "WHERE src IN (SELECT id FROM nodes WHERE type IN "
                    "  ('slack_message','slack_channel'))"
                )
                stats.edges = int(row["count"])

    finally:
        await embedder.aclose()
        await pool.close()

    log.info("slack done: %s", stats)
    return stats
