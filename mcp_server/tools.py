"""MCP tool implementations.

Each function returns a JSON-friendly dict the agent can read directly.
Errors raise so the MCP runtime surfaces them as tool errors.
"""

from __future__ import annotations

import re
import subprocess
from typing import Any

from .state import STATE


# --- helpers ---------------------------------------------------------------


async def _resolve_repo_slug(slug: str | None) -> tuple[str, str]:
    """If slug is None and exactly one repo is indexed, return that one."""
    pool = STATE.pool
    assert pool is not None
    async with pool.acquire() as conn:
        if slug:
            owner, _, name = slug.partition("/")
            row = await conn.fetchrow(
                "SELECT owner, name FROM repos WHERE owner=$1 AND name=$2",
                owner, name,
            )
            if not row:
                raise ValueError(f"repo {slug!r} not indexed")
            return owner, name
        rows = await conn.fetch("SELECT owner, name FROM repos")
        if len(rows) == 1:
            return rows[0]["owner"], rows[0]["name"]
        if not rows:
            raise ValueError("no repos indexed")
        slugs = [f"{r['owner']}/{r['name']}" for r in rows]
        raise ValueError(f"multiple repos indexed; pass `repo=`: {slugs}")


def _snippet(text: str, limit: int = 400) -> str:
    text = (text or "").strip()
    return text if len(text) <= limit else text[: limit - 1] + "…"


async def _key_prefix(slug: str) -> str:
    return f"gh:{slug}:"


# --- tools -----------------------------------------------------------------


async def search_context(
    query: str, types: list[str] | None = None, k: int = 10, repo: str | None = None,
) -> dict[str, Any]:
    """Hybrid: embed query, kNN over chunks, optionally filtered by node type."""
    pool = STATE.pool
    embedder = STATE.embedder
    assert pool is not None and embedder is not None

    k = max(1, min(k, 20))

    owner, name = await _resolve_repo_slug(repo)
    slug = f"{owner}/{name}"

    vec = await embedder.embed_query(query)
    type_filter_sql = ""
    args: list[Any] = [vec, await _key_prefix(slug) + "%", k]
    if types:
        type_filter_sql = "AND n.type = ANY($4::text[])"
        args.append(types)

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            f"""
            SELECT n.id, n.type, n.source_key, n.props,
                   c.text, c.meta,
                   1 - (c.embedding <=> $1) AS score
            FROM chunks c
            JOIN nodes  n ON n.id = c.node_id
            WHERE n.source_key LIKE $2
              {type_filter_sql}
            ORDER BY c.embedding <=> $1
            LIMIT $3
            """,
            *args,
        )

    return {
        "repo": slug,
        "query": query,
        "results": [
            {
                "node_id": int(r["id"]),
                "type": r["type"],
                "source_key": r["source_key"],
                "score": float(r["score"]),
                "snippet": _snippet(r["text"]),
                "props": r["props"],
                "meta": r["meta"],
            }
            for r in rows
        ],
    }


async def get_node(id: int) -> dict[str, Any]:
    pool = STATE.pool
    assert pool is not None
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM nodes WHERE id=$1", id)
        if not row:
            raise ValueError(f"node {id} not found")
        chunks = await conn.fetch(
            "SELECT id, text, meta FROM chunks WHERE node_id=$1 ORDER BY id", id,
        )
    return {
        "id": int(row["id"]),
        "type": row["type"],
        "source_key": row["source_key"],
        "props": row["props"],
        "chunks": [
            {"id": int(c["id"]), "text": c["text"], "meta": c["meta"]} for c in chunks
        ],
    }


async def get_neighbors(
    id: int, edge_types: list[str] | None = None, depth: int = 1, direction: str = "both",
) -> dict[str, Any]:
    """Recursive CTE traversal up to `depth` hops.

    direction: "out" follows src->dst, "in" follows dst->src, "both" follows both.
    """
    if depth < 1 or depth > 4:
        raise ValueError("depth must be in [1, 4]")
    if direction not in ("out", "in", "both"):
        raise ValueError("direction must be one of out|in|both")

    pool = STATE.pool
    assert pool is not None

    out_clause = "SELECT e.dst AS next_id FROM edges e WHERE e.src = w.node_id"
    in_clause = "SELECT e.src AS next_id FROM edges e WHERE e.dst = w.node_id"
    where = []
    if edge_types:
        out_clause += " AND e.type = ANY($2::text[])"
        in_clause += " AND e.type = ANY($2::text[])"
    if direction == "out":
        union_sql = out_clause
    elif direction == "in":
        union_sql = in_clause
    else:
        union_sql = f"{out_clause} UNION {in_clause}"

    args: list[Any] = [id]
    if edge_types:
        args.append(edge_types)
    args.append(depth)

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            f"""
            WITH RECURSIVE walk AS (
                SELECT $1::bigint AS node_id, 0 AS hop
              UNION
                SELECT next_id, w.hop + 1
                FROM walk w
                JOIN LATERAL ({union_sql}) edges_step ON true
                WHERE w.hop < ${len(args)}
            )
            SELECT DISTINCT n.id, n.type, n.source_key, n.props
            FROM walk w JOIN nodes n ON n.id = w.node_id
            WHERE n.id <> $1
            """,
            *args,
        )
        # Also fetch the actual edges that connect any returned nodes (one hop each)
        edges = await conn.fetch(
            """
            SELECT src, dst, type, props
            FROM edges
            WHERE src = ANY($1::bigint[]) OR dst = ANY($1::bigint[])
            """,
            [id, *[r["id"] for r in rows]],
        )

    return {
        "root": id,
        "nodes": [
            {"id": int(r["id"]), "type": r["type"], "source_key": r["source_key"], "props": r["props"]}
            for r in rows
        ],
        "edges": [
            {"src": int(e["src"]), "dst": int(e["dst"]), "type": e["type"], "props": e["props"]}
            for e in edges
        ],
    }


async def trace_issue(issue_number: int, repo: str | None = None, k: int = 8) -> dict[str, Any]:
    """Headline tool: given an issue number, return everything an agent
    needs to start root-causing — the issue, the closest code in the repo
    (semantic), recent PRs that modified that code, their authors, and any
    PRs that already claim to fix it.
    """
    pool = STATE.pool
    embedder = STATE.embedder
    assert pool is not None and embedder is not None

    owner, name = await _resolve_repo_slug(repo)
    slug = f"{owner}/{name}"
    issue_key = f"gh:{slug}:issue:{issue_number}"

    async with pool.acquire() as conn:
        issue_row = await conn.fetchrow(
            "SELECT id, props FROM nodes WHERE type='issue' AND source_key=$1", issue_key,
        )
        if not issue_row:
            raise ValueError(f"issue #{issue_number} not indexed for {slug}")
        issue_id = int(issue_row["id"])
        issue_props = issue_row["props"]

        # Existing PRs marked as fixing this issue
        fixing_prs = await conn.fetch(
            """
            SELECT n.id, n.source_key, n.props
            FROM edges e JOIN nodes n ON n.id = e.src
            WHERE e.dst = $1 AND e.type = 'fixes' AND n.type = 'pr'
            """,
            issue_id,
        )

    # Semantic search for suspect code, scoped to file/symbol/doc_chunk
    query = (issue_props.get("title") or "") + "\n" + (issue_props.get("body") or "")
    suspect = await search_context(
        query=query,
        types=["symbol", "file", "doc_chunk"],
        k=k,
        repo=slug,
    )

    # For each suspect file/symbol, find recent PRs that modified the file
    suspect_file_ids: list[int] = []
    async with pool.acquire() as conn:
        for r in suspect["results"]:
            if r["type"] == "file":
                suspect_file_ids.append(r["node_id"])
            elif r["type"] == "symbol":
                # symbol -> file via 'defined_in'
                row = await conn.fetchrow(
                    """
                    SELECT n.id FROM edges e JOIN nodes n ON n.id = e.dst
                    WHERE e.src = $1 AND e.type = 'defined_in'
                    """,
                    r["node_id"],
                )
                if row:
                    suspect_file_ids.append(int(row["id"]))

        suspect_file_ids = list(dict.fromkeys(suspect_file_ids))[:5]

        recent_prs: list[dict[str, Any]] = []
        if suspect_file_ids:
            pr_rows = await conn.fetch(
                """
                SELECT DISTINCT pr.id, pr.source_key, pr.props,
                       e.dst AS file_id, e.props AS edge_props
                FROM edges e
                JOIN nodes pr ON pr.id = e.src
                WHERE e.type = 'modifies'
                  AND pr.type = 'pr'
                  AND e.dst = ANY($1::bigint[])
                ORDER BY pr.props->>'merged_at' DESC NULLS LAST
                LIMIT 8
                """,
                suspect_file_ids,
            )
            recent_prs = [
                {
                    "node_id": int(r["id"]),
                    "source_key": r["source_key"],
                    "title": (r["props"] or {}).get("title"),
                    "number": (r["props"] or {}).get("number"),
                    "merged_at": (r["props"] or {}).get("merged_at"),
                    "html_url": (r["props"] or {}).get("html_url"),
                    "modified_file_id": int(r["file_id"]),
                    "additions": (r["edge_props"] or {}).get("additions"),
                    "deletions": (r["edge_props"] or {}).get("deletions"),
                    "status": (r["edge_props"] or {}).get("status"),
                }
                for r in pr_rows
            ]

    return {
        "repo": slug,
        "issue": {
            "node_id": issue_id,
            "number": issue_number,
            "title": issue_props.get("title"),
            "body": issue_props.get("body"),
            "state": issue_props.get("state"),
            "html_url": issue_props.get("html_url"),
            "labels": issue_props.get("labels"),
        },
        "claimed_fix_prs": [
            {
                "node_id": int(p["id"]),
                "source_key": p["source_key"],
                "number": (p["props"] or {}).get("number"),
                "title": (p["props"] or {}).get("title"),
                "html_url": (p["props"] or {}).get("html_url"),
            }
            for p in fixing_prs
        ],
        "suspect_code": suspect["results"],
        "recent_prs_touching_suspects": recent_prs,
    }


_GIT_BLAME_RE = re.compile(r"^([0-9a-f]{7,40})\s")


async def git_blame(
    file_path: str, line_start: int, line_end: int | None = None, repo: str | None = None,
) -> dict[str, Any]:
    """Run `git blame -L line_start,line_end` against the local clone and
    enrich each unique commit with its node row + linked PR (if any)."""
    cfg = STATE.cfg
    pool = STATE.pool
    assert cfg is not None and pool is not None

    owner, name = await _resolve_repo_slug(repo)
    slug = f"{owner}/{name}"
    repo_dir = cfg.cache_dir / owner / name
    if not repo_dir.exists():
        raise ValueError(f"local clone for {slug} not found at {repo_dir}")

    le = line_end or line_start
    out = subprocess.run(
        ["git", "-C", str(repo_dir), "blame", "-L", f"{line_start},{le}", "--porcelain", "--", file_path],
        capture_output=True, text=True,
    )
    if out.returncode != 0:
        raise ValueError(out.stderr.strip() or "git blame failed")

    # Parse porcelain header lines: SHA originalLine finalLine [groupSize]
    seen: dict[str, dict[str, Any]] = {}
    for line in out.stdout.splitlines():
        if not line or line.startswith("\t"):
            continue
        m = re.match(r"^([0-9a-f]{40})\s+(\d+)\s+(\d+)", line)
        if m:
            sha = m.group(1)
            seen.setdefault(sha, {"sha": sha, "first_line": int(m.group(3))})

    # Enrich
    async with pool.acquire() as conn:
        commits: list[dict[str, Any]] = []
        for sha, info in seen.items():
            row = await conn.fetchrow(
                "SELECT id, props FROM nodes WHERE type='commit' AND source_key=$1",
                f"gh:{slug}:commit:{sha}",
            )
            commit_node = (
                {
                    "node_id": int(row["id"]),
                    "props": row["props"],
                }
                if row else None
            )
            # PRs whose merge_commit_sha == sha or that contain this commit
            pr_row = await conn.fetchrow(
                """
                SELECT id, source_key, props FROM nodes
                WHERE type='pr' AND props->>'merge_commit_sha' = $1
                """,
                sha,
            )
            pr_node = (
                {
                    "node_id": int(pr_row["id"]),
                    "source_key": pr_row["source_key"],
                    "props": pr_row["props"],
                }
                if pr_row else None
            )
            commits.append({**info, "commit": commit_node, "pull_request": pr_node})

    return {
        "repo": slug,
        "file_path": file_path,
        "line_start": line_start,
        "line_end": le,
        "blame": commits,
    }


async def get_pr_diff(pr_number: int, repo: str | None = None) -> dict[str, Any]:
    """Return PR metadata plus the per-file modifies edges (with truncated patches)."""
    pool = STATE.pool
    assert pool is not None
    owner, name = await _resolve_repo_slug(repo)
    slug = f"{owner}/{name}"

    async with pool.acquire() as conn:
        pr_row = await conn.fetchrow(
            "SELECT id, props FROM nodes WHERE type='pr' AND source_key=$1",
            f"gh:{slug}:pr:{pr_number}",
        )
        if not pr_row:
            raise ValueError(f"PR #{pr_number} not indexed for {slug}")
        files = await conn.fetch(
            """
            SELECT n.props AS file_props, e.props AS edge_props
            FROM edges e JOIN nodes n ON n.id = e.dst
            WHERE e.src = $1 AND e.type = 'modifies'
            """,
            int(pr_row["id"]),
        )

    return {
        "repo": slug,
        "pr": {
            "node_id": int(pr_row["id"]),
            "number": pr_number,
            **{
                k: pr_row["props"].get(k)
                for k in (
                    "title", "state", "merged", "merged_at", "body", "html_url",
                    "head_ref", "base_ref", "merge_commit_sha", "created_at",
                )
            },
        },
        "files": [
            {
                "path": (f["file_props"] or {}).get("path"),
                "language": (f["file_props"] or {}).get("language"),
                "status": (f["edge_props"] or {}).get("status"),
                "additions": (f["edge_props"] or {}).get("additions"),
                "deletions": (f["edge_props"] or {}).get("deletions"),
                "patch": _truncate(((f["edge_props"] or {}).get("patch") or ""), 2000),
            }
            for f in files[:20]
        ],
        "files_truncated": len(files) > 20,
    }


def _truncate(s: str, limit: int) -> str:
    if len(s) <= limit:
        return s
    return s[: limit - 1] + "…"


async def list_repos() -> dict[str, Any]:
    """List indexed repos and basic stats."""
    pool = STATE.pool
    assert pool is not None
    async with pool.acquire() as conn:
        repos = await conn.fetch(
            "SELECT owner, name, default_branch, last_indexed_at, head_sha FROM repos ORDER BY last_indexed_at DESC NULLS LAST",
        )
        out = []
        for r in repos:
            slug = f"{r['owner']}/{r['name']}"
            counts = await conn.fetch(
                "SELECT type, count(*) AS n FROM nodes WHERE source_key LIKE $1 GROUP BY type",
                f"gh:{slug}:%",
            )
            out.append({
                "owner": r["owner"], "name": r["name"], "slug": slug,
                "default_branch": r["default_branch"],
                "last_indexed_at": r["last_indexed_at"].isoformat() if r["last_indexed_at"] else None,
                "head_sha": r["head_sha"],
                "node_counts": {c["type"]: int(c["n"]) for c in counts},
            })
    return {"repos": out}
