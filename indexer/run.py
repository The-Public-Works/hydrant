"""End-to-end indexing orchestrator.

Run via `python -m indexer <repo-url-or-slug>`.

Phases:
  1. Clone (or fetch) the repo locally.
  2. Walk files → File / Symbol / DocChunk nodes.
  3. Pull GitHub issues, PRs (with file lists), commits, comments → nodes + edges.
  4. Embed all chunkable content into the `chunks` table.

Each phase upserts on (type, source_key) so re-running is idempotent.
"""

from __future__ import annotations

import asyncio
import logging
import re
from dataclasses import dataclass
from pathlib import Path

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
from .github_fetcher import GitHub, RepoRef
from .parser import (
    DocChunkRecord,
    FileRecord,
    SymbolRecord,
    WalkResult,
    ensure_clone,
    walk_repo,
)

log = logging.getLogger(__name__)

# Match "Fixes #123", "Closes GH-9", "resolves owner/repo#42" etc.
ISSUE_LINK_RE = re.compile(
    r"\b(?:fix(?:e[sd])?|close[sd]?|resolve[sd]?)\b[^#\n]{0,30}#(\d+)",
    re.IGNORECASE,
)
HASH_REF_RE = re.compile(r"(?<![&\w])#(\d+)\b")


@dataclass
class IndexStats:
    files: int = 0
    symbols: int = 0
    doc_chunks: int = 0
    issues: int = 0
    prs: int = 0
    commits: int = 0
    authors: int = 0
    comments: int = 0
    edges: int = 0
    chunks: int = 0


# --- helpers ---------------------------------------------------------------


def _file_key(ref: RepoRef, path: str) -> str:
    return f"gh:{ref.slug}:file:{path}"


def _symbol_key(ref: RepoRef, file_path: str, name: str) -> str:
    return f"gh:{ref.slug}:symbol:{file_path}::{name}"


def _doc_chunk_key(ref: RepoRef, file_path: str, line_start: int) -> str:
    return f"gh:{ref.slug}:doc:{file_path}#L{line_start}"


def _issue_key(ref: RepoRef, number: int) -> str:
    return f"gh:{ref.slug}:issue:{number}"


def _pr_key(ref: RepoRef, number: int) -> str:
    return f"gh:{ref.slug}:pr:{number}"


def _commit_key(ref: RepoRef, sha: str) -> str:
    return f"gh:{ref.slug}:commit:{sha}"


def _author_key(login: str) -> str:
    return f"gh:author:{login.lower()}"


def _comment_key(ref: RepoRef, kind: str, comment_id: int) -> str:
    return f"gh:{ref.slug}:comment:{kind}:{comment_id}"


# --- phases ---------------------------------------------------------------


async def _index_repo_meta(conn: asyncpg.Connection, ref: RepoRef, walk: WalkResult) -> int:
    row = await conn.fetchrow(
        """
        INSERT INTO repos (owner, name, default_branch, last_indexed_at, head_sha)
        VALUES ($1, $2, $3, now(), $4)
        ON CONFLICT (owner, name) DO UPDATE
          SET default_branch = EXCLUDED.default_branch,
              last_indexed_at = EXCLUDED.last_indexed_at,
              head_sha = EXCLUDED.head_sha
        RETURNING id
        """,
        ref.owner, ref.name, walk.default_branch, walk.head_sha,
    )
    return int(row["id"])


async def _index_local_walk(
    conn: asyncpg.Connection, ref: RepoRef, walk: WalkResult,
) -> tuple[dict[str, int], dict[tuple[str, str], int], dict[str, int]]:
    """Returns dicts keyed for downstream lookups:
        files: rel_path -> node_id
        symbols: (rel_path, name) -> node_id
        doc_chunks: source_key -> node_id
    """
    files: dict[str, int] = {}
    for f in walk.files:
        nid = await upsert_node(
            conn, type="file", source_key=_file_key(ref, f.path),
            props={
                "path": f.path, "language": f.language, "size": f.size,
                "last_commit_sha": f.last_commit_sha,
                "last_commit_at": f.last_commit_at,
            },
        )
        files[f.path] = nid

    symbols: dict[tuple[str, str], int] = {}
    for s in walk.symbols:
        nid = await upsert_node(
            conn, type="symbol", source_key=_symbol_key(ref, s.file_path, s.name),
            props={
                "name": s.name, "kind": s.kind, "file_path": s.file_path,
                "line_start": s.line_start, "line_end": s.line_end,
                "docstring": s.docstring,
            },
        )
        symbols[(s.file_path, s.name)] = nid
        # Symbol -> File (DEFINED_IN)
        if s.file_path in files:
            await upsert_edge(conn, src=nid, dst=files[s.file_path], type="defined_in")

    doc_chunks: dict[str, int] = {}
    for d in walk.doc_chunks:
        key = _doc_chunk_key(ref, d.file_path, d.line_start)
        nid = await upsert_node(
            conn, type="doc_chunk", source_key=key,
            props={
                "file_path": d.file_path, "section": d.section,
                "line_start": d.line_start, "line_end": d.line_end,
            },
        )
        doc_chunks[key] = nid
        if d.file_path in files:
            await upsert_edge(conn, src=nid, dst=files[d.file_path], type="part_of")
    return files, symbols, doc_chunks


async def _ensure_author(
    conn: asyncpg.Connection, cache: dict[str, int], user: dict | None,
) -> int | None:
    if not user or not user.get("login"):
        return None
    login = user["login"]
    if login in cache:
        return cache[login]
    nid = await upsert_node(
        conn, type="author", source_key=_author_key(login),
        props={"login": login, "html_url": user.get("html_url"), "id": user.get("id")},
    )
    cache[login] = nid
    return nid


async def _index_github(
    conn: asyncpg.Connection,
    gh: GitHub,
    ref: RepoRef,
    files: dict[str, int],
    walk: WalkResult,
    stats: IndexStats,
) -> tuple[dict[int, int], dict[int, int], dict[str, int]]:
    """Returns: issues (number->node_id), prs (number->node_id), commits (sha->node_id)."""
    issues: dict[int, int] = {}
    prs: dict[int, int] = {}
    commits: dict[str, int] = {}
    authors: dict[str, int] = {}

    # Issues
    async for it in gh.issues(ref):
        nid = await upsert_node(
            conn, type="issue", source_key=_issue_key(ref, it["number"]),
            props={
                "number": it["number"], "title": it.get("title"),
                "state": it.get("state"), "body": it.get("body"),
                "html_url": it.get("html_url"),
                "created_at": it.get("created_at"),
                "closed_at": it.get("closed_at"),
                "labels": [l.get("name") for l in it.get("labels", [])],
            },
        )
        issues[it["number"]] = nid
        stats.issues += 1
        author_id = await _ensure_author(conn, authors, it.get("user"))
        if author_id:
            await upsert_edge(conn, src=nid, dst=author_id, type="authored_by")

    # PRs (and per-PR file modifications)
    async for pr in gh.pulls(ref):
        nid = await upsert_node(
            conn, type="pr", source_key=_pr_key(ref, pr["number"]),
            props={
                "number": pr["number"], "title": pr.get("title"),
                "state": pr.get("state"), "merged": pr.get("merged_at") is not None,
                "merged_at": pr.get("merged_at"), "body": pr.get("body"),
                "html_url": pr.get("html_url"),
                "created_at": pr.get("created_at"),
                "merge_commit_sha": pr.get("merge_commit_sha"),
                "head_ref": (pr.get("head") or {}).get("ref"),
                "base_ref": (pr.get("base") or {}).get("ref"),
            },
        )
        prs[pr["number"]] = nid
        stats.prs += 1
        author_id = await _ensure_author(conn, authors, pr.get("user"))
        if author_id:
            await upsert_edge(conn, src=nid, dst=author_id, type="authored_by")

        # FIXES via "Fixes #N" in body/title
        text_blob = " ".join(filter(None, [pr.get("title"), pr.get("body")]))
        for m in ISSUE_LINK_RE.finditer(text_blob):
            num = int(m.group(1))
            if num in issues:
                await upsert_edge(conn, src=nid, dst=issues[num], type="fixes")

        # MODIFIES via PR files endpoint
        try:
            pr_files = await gh.pull_files(ref, pr["number"])
        except Exception as e:  # noqa: BLE001
            log.warning("pull_files failed for #%d: %s", pr["number"], e)
            pr_files = []
        for pf in pr_files:
            fpath = pf.get("filename")
            if not fpath:
                continue
            file_nid = files.get(fpath)
            if file_nid is None:
                # File no longer exists at HEAD (deleted/renamed) — synthesize a stub node
                file_nid = await upsert_node(
                    conn, type="file", source_key=_file_key(ref, fpath),
                    props={"path": fpath, "deleted": True},
                )
                files[fpath] = file_nid
            await upsert_edge(
                conn, src=nid, dst=file_nid, type="modifies",
                props={
                    "additions": pf.get("additions"),
                    "deletions": pf.get("deletions"),
                    "status": pf.get("status"),
                    "patch": (pf.get("patch") or "")[:8000],  # cap patch size
                },
            )

    # Commits (lightweight metadata only)
    async for c in gh.commits(ref):
        sha = c["sha"]
        commit_meta = c.get("commit") or {}
        nid = await upsert_node(
            conn, type="commit", source_key=_commit_key(ref, sha),
            props={
                "sha": sha,
                "message": commit_meta.get("message"),
                "author_name": (commit_meta.get("author") or {}).get("name"),
                "author_email": (commit_meta.get("author") or {}).get("email"),
                "authored_at": (commit_meta.get("author") or {}).get("date"),
                "html_url": c.get("html_url"),
            },
        )
        commits[sha] = nid
        stats.commits += 1
        author_id = await _ensure_author(conn, authors, c.get("author"))
        if author_id:
            await upsert_edge(conn, src=nid, dst=author_id, type="authored_by")
        # Commit -> Issue mentions in commit message
        for m in HASH_REF_RE.finditer(commit_meta.get("message") or ""):
            num = int(m.group(1))
            if num in issues:
                await upsert_edge(conn, src=nid, dst=issues[num], type="mentions")

    # File LAST_MODIFIED_BY commit. Use shas captured during the local walk.
    # Shas older than our commit-fetch window get a stub commit node so the
    # edge is still preserved.
    for f in walk.files:
        if not f.last_commit_sha:
            continue
        fnid = files.get(f.path)
        if fnid is None:
            continue
        cnid = commits.get(f.last_commit_sha)
        if cnid is None:
            cnid = await upsert_node(
                conn, type="commit", source_key=_commit_key(ref, f.last_commit_sha),
                props={"sha": f.last_commit_sha, "authored_at": f.last_commit_at, "stub": True},
            )
            commits[f.last_commit_sha] = cnid
        await upsert_edge(conn, src=fnid, dst=cnid, type="last_modified_by")

    # Issue + PR comments
    async for ic in gh.issue_comments(ref):
        url = ic.get("issue_url", "")
        m = re.search(r"/issues/(\d+)$", url)
        if not m:
            continue
        ref_num = int(m.group(1))
        target_nid = issues.get(ref_num) or prs.get(ref_num)
        if target_nid is None:
            continue
        cid = ic["id"]
        nid = await upsert_node(
            conn, type="comment", source_key=_comment_key(ref, "issue", cid),
            props={
                "id": cid, "body": ic.get("body"),
                "html_url": ic.get("html_url"),
                "created_at": ic.get("created_at"),
                "kind": "issue",
            },
        )
        stats.comments += 1
        await upsert_edge(conn, src=nid, dst=target_nid, type="on")
        author_id = await _ensure_author(conn, authors, ic.get("user"))
        if author_id:
            await upsert_edge(conn, src=nid, dst=author_id, type="authored_by")

    async for rc in gh.pull_review_comments(ref):
        # pull_request_url like .../pulls/123
        m = re.search(r"/pulls/(\d+)$", rc.get("pull_request_url", ""))
        if not m:
            continue
        ref_num = int(m.group(1))
        target_nid = prs.get(ref_num)
        if target_nid is None:
            continue
        cid = rc["id"]
        nid = await upsert_node(
            conn, type="comment", source_key=_comment_key(ref, "review", cid),
            props={
                "id": cid, "body": rc.get("body"),
                "html_url": rc.get("html_url"),
                "created_at": rc.get("created_at"),
                "path": rc.get("path"),
                "line": rc.get("line"),
                "kind": "review",
            },
        )
        stats.comments += 1
        await upsert_edge(conn, src=nid, dst=target_nid, type="on")
        author_id = await _ensure_author(conn, authors, rc.get("user"))
        if author_id:
            await upsert_edge(conn, src=nid, dst=author_id, type="authored_by")
        # Review comment -> File at that path
        if rc.get("path") and rc["path"] in files:
            await upsert_edge(conn, src=nid, dst=files[rc["path"]], type="references")

    stats.authors = len(authors)
    return issues, prs, commits


# --- embedding phase -------------------------------------------------------


def _doc_text_for_node(props: dict, type_: str) -> str | None:
    """Build the text we want to embed for a given node."""
    if type_ == "issue" or type_ == "pr":
        title = props.get("title") or ""
        body = props.get("body") or ""
        return f"{title}\n\n{body}".strip() or None
    if type_ == "commit":
        return (props.get("message") or "").strip() or None
    if type_ == "comment":
        return (props.get("body") or "").strip() or None
    return None


async def _embed_phase(conn: asyncpg.Connection, embedder: Embedder, walk: WalkResult, ref: RepoRef, stats: IndexStats) -> None:
    """Build (node_id, text, meta) triples, embed in batches, insert into chunks."""

    # Symbols + doc_chunks: take from walk (have the text already in memory).
    triples: list[tuple[int, str, dict]] = []

    for s in walk.symbols:
        row = await conn.fetchrow(
            "SELECT id FROM nodes WHERE type='symbol' AND source_key=$1",
            _symbol_key(ref, s.file_path, s.name),
        )
        if not row:
            continue
        text = f"{s.kind} {s.name} in {s.file_path}\n"
        if s.docstring:
            text += s.docstring + "\n\n"
        text += s.body
        triples.append((int(row["id"]), text, {"line_start": s.line_start, "line_end": s.line_end}))

    for d in walk.doc_chunks:
        row = await conn.fetchrow(
            "SELECT id FROM nodes WHERE type='doc_chunk' AND source_key=$1",
            _doc_chunk_key(ref, d.file_path, d.line_start),
        )
        if not row:
            continue
        triples.append((int(row["id"]), d.text, {"section": d.section, "file_path": d.file_path}))

    # Issues/PRs/commits/comments: pull from DB (we don't carry their text in memory)
    for type_ in ("issue", "pr", "commit", "comment"):
        rows = await conn.fetch(
            "SELECT id, props FROM nodes WHERE type=$1 AND source_key LIKE $2",
            type_, f"gh:{ref.slug}:%",
        )
        for r in rows:
            text = _doc_text_for_node(r["props"], type_)
            if text:
                triples.append((int(r["id"]), text, {"node_type": type_}))

    if not triples:
        return

    # Wipe prior chunks for these nodes so re-indexing doesn't duplicate
    await clear_chunks_for_nodes(conn, [t[0] for t in triples])

    # Embed in batches
    BATCH = 128
    for i in range(0, len(triples), BATCH):
        batch = triples[i : i + BATCH]
        vecs = await embedder.embed_documents([t[1] for t in batch])
        rows = [
            (nid, text, vec, meta)
            for (nid, text, meta), vec in zip(batch, vecs, strict=False)
            if vec is not None
        ]
        await insert_chunks(conn, rows)
        stats.chunks += len(rows)
        log.info("embedded %d/%d", min(i + BATCH, len(triples)), len(triples))


# --- top-level orchestrator ------------------------------------------------


async def index_repo(repo_url_or_slug: str, cfg: Config | None = None) -> IndexStats:
    cfg = cfg or Config.load()
    ref = RepoRef.parse(repo_url_or_slug)
    log.info("indexing %s", ref.slug)

    clone_url = f"https://x-access-token:{cfg.github_token}@github.com/{ref.slug}.git"
    local = ensure_clone(clone_url, cfg.cache_dir / ref.owner / ref.name)
    walk = walk_repo(local)
    log.info(
        "walked %s: %d files, %d symbols, %d doc chunks, head=%s",
        ref.slug, len(walk.files), len(walk.symbols), len(walk.doc_chunks), walk.head_sha[:8],
    )

    pool = await open_pool(cfg.database_url)
    embedder = Embedder(cfg.voyage_api_key, cfg.voyage_model)
    stats = IndexStats(
        files=len(walk.files), symbols=len(walk.symbols), doc_chunks=len(walk.doc_chunks),
    )

    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                await _index_repo_meta(conn, ref, walk)
                files, _symbols, _docs = await _index_local_walk(conn, ref, walk)
            async with GitHub(cfg.github_token) as gh:
                async with conn.transaction():
                    await _index_github(conn, gh, ref, files, walk, stats)
            # Embedding outside the giant transaction so partial progress is durable.
            await _embed_phase(conn, embedder, walk, ref, stats)
            row = await conn.fetchrow("SELECT count(*) FROM edges")
            stats.edges = int(row["count"])
    finally:
        await embedder.aclose()
        await pool.close()

    log.info("done: %s", stats)
    return stats
