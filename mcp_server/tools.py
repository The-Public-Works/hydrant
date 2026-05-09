"""MCP tool implementations.

Each function returns a JSON-friendly dict the agent can read directly.
Errors raise so the MCP runtime surfaces them as tool errors.

Tool families:
  * GitHub-only (existing): search_context, get_node, get_neighbors,
    trace_issue, git_blame, get_pr_diff, list_repos. These require a
    repo to be indexed and use the `gh:owner/name:%` source-key prefix.

  * Cross-source (new, demo-flavored): search_all, find_similar_incidents,
    get_runbook, who_owns, diagnose_incident. These span the Slack +
    Linear + GitHub corpora and don't require a repo argument — the
    intent is "given a symptom, surface everything we know about it
    from any source." `diagnose_incident` is the headline composite:
    one call returns ranked similar incidents + the matching runbook
    + the owners for the affected area.
"""

from __future__ import annotations

import re
import subprocess
from pathlib import Path
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


# ===========================================================================
# Cross-source tools
# ---------------------------------------------------------------------------
# Built for the demo flow: "given a symptom, surface everything we know about
# it from Slack + Linear + GitHub in one call." The unified result shape lets
# the agent render every hit as a citation regardless of source.
# ===========================================================================


# Map a high-level "source" name (slack/linear/github) to the underlying
# node types. Lets callers filter without knowing the schema.
_SOURCE_TYPES: dict[str, list[str]] = {
    "slack": ["slack_message", "slack_channel"],
    "linear": ["linear_issue", "linear_comment", "linear_team"],
    "github": ["file", "doc_chunk", "symbol", "commit", "pr", "issue", "comment"],
}


def _classify_source(node_type: str) -> str:
    """Inverse of _SOURCE_TYPES — which source does this node belong to?"""
    if node_type.startswith("slack"):
        return "slack"
    if node_type.startswith("linear"):
        return "linear"
    return "github"


def _github_url_for(source_key: str, props: dict) -> str | None:
    """Construct a deep link to a GitHub file/path on the default branch.

    We don't store html_urls for code/docs nodes — only for issues/PRs. So
    for files and doc_chunks we synthesize a URL from the source_key
    (which has the owner/repo) and the path. Best-effort; returns None if
    the source_key isn't a GitHub one.

    Format: https://github.com/<owner>/<repo>/blob/main/<path>[#L<start>[-L<end>]]
    """
    if not source_key.startswith("gh:"):
        return None
    # gh:<owner/name>:<type>:<rest>
    rest = source_key[3:]
    slug, _, _ = rest.partition(":")
    if "/" not in slug:
        return None
    fpath = props.get("file_path") or props.get("path")
    if not fpath:
        return None
    url = f"https://github.com/{slug}/blob/main/{fpath}"
    line_start = props.get("line_start")
    if line_start:
        url += f"#L{line_start}"
        line_end = props.get("line_end")
        if line_end and line_end != line_start:
            url += f"-L{line_end}"
    return url


def _format_unified(row: dict) -> dict[str, Any]:
    """Turn a chunks-join-nodes row into the standard {source, type, title,
    url, snippet, score, metadata} shape that every cross-source tool returns.

    Centralized so the agent sees identical shapes whether the hit came from
    Slack, Linear, or GitHub — makes the prompt-side rendering trivial.
    """
    node_type = row["type"]
    props = row.get("props") or {}
    source = _classify_source(node_type)

    if node_type == "slack_message":
        title = f"#{props.get('channel_name', '?')}"
        url = props.get("html_url")
        metadata = {
            "channel_name": props.get("channel_name"),
            "ts": props.get("ts"),
            "thread_ts": props.get("thread_ts"),
            "user": props.get("user"),
        }
    elif node_type == "slack_channel":
        title = f"#{props.get('name', '?')} (channel)"
        url = None
        metadata = {"topic": props.get("topic")}
    elif node_type == "linear_issue":
        title = f"{props.get('identifier', '?')} — {props.get('title', '')}"
        url = props.get("url")
        metadata = {
            "identifier": props.get("identifier"),
            "state": props.get("state"),
            "priority": props.get("priority"),
            "labels": props.get("labels"),
        }
    elif node_type == "linear_comment":
        title = f"comment on {(props.get('issue_identifier') or '?')}"
        url = props.get("url")
        metadata = {"issue_identifier": props.get("issue_identifier")}
    elif node_type == "doc_chunk":
        # GitHub doc chunk — a section of a markdown/yaml/etc file
        path = props.get("file_path", "?")
        section = props.get("section")
        title = f"{path}" + (f" — {section}" if section else "")
        url = _github_url_for(row["source_key"], props)
        metadata = {
            "file_path": path,
            "section": section,
            "line_start": props.get("line_start"),
            "line_end": props.get("line_end"),
        }
    elif node_type == "file":
        path = props.get("path", "?")
        title = path
        url = _github_url_for(row["source_key"], props)
        metadata = {"path": path, "language": props.get("language")}
    elif node_type in ("issue", "pr"):
        n = props.get("number")
        kind = "Issue" if node_type == "issue" else "PR"
        title = f"{kind} #{n} — {props.get('title', '')}"
        url = props.get("html_url")
        metadata = {"number": n, "state": props.get("state")}
    elif node_type == "commit":
        sha = (props.get("sha") or "")[:8]
        msg = (props.get("message") or "").splitlines()[0] if props.get("message") else ""
        title = f"commit {sha} — {msg[:60]}"
        url = props.get("html_url")
        metadata = {"sha": props.get("sha"), "authored_at": props.get("authored_at")}
    else:
        title = node_type
        url = props.get("html_url") or props.get("url")
        metadata = {}

    return {
        "source": source,
        "type": node_type,
        "title": title,
        "url": url,
        "snippet": _snippet(row.get("text") or ""),
        "score": float(row["score"]) if "score" in row else None,
        "metadata": metadata,
    }


async def _semantic_search(
    query: str,
    *,
    k: int,
    type_filter: list[str] | None = None,
    extra_where_sql: str = "",
    extra_args: list[Any] | None = None,
) -> list[dict[str, Any]]:
    """Shared kNN core. Embeds `query`, runs the search, returns raw rows
    formatted via `_format_unified`. The caller controls scoping via the
    optional type filter and an extra WHERE fragment (which can reference
    `n.type`, `n.props`, `n.source_key`).

    `extra_where_sql` must be a parameterized fragment using $N placeholders
    starting from the next available index (the embedding is $1, the LIMIT
    is the last). Pass values for those placeholders in `extra_args`.
    """
    pool = STATE.pool
    embedder = STATE.embedder
    assert pool is not None and embedder is not None

    k = max(1, min(k, 25))
    vec = await embedder.embed_query(query)

    # Build the SQL piece-by-piece. Order of placeholders:
    #   $1                 — embedding
    #   $2..$(2+E-1)       — extra_where_sql args
    #   $(2+E)             — type_filter array (if present)
    #   $(2+E+T)           — k (always the last)
    args: list[Any] = [vec]
    where_clauses: list[str] = []

    if extra_where_sql:
        where_clauses.append(f"({extra_where_sql})")
        args.extend(extra_args or [])

    if type_filter:
        args.append(type_filter)
        where_clauses.append(f"n.type = ANY(${len(args)}::text[])")

    args.append(k)
    where_sql = " AND ".join(where_clauses) if where_clauses else "TRUE"

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            f"""
            SELECT n.id, n.type, n.source_key, n.props,
                   c.text,
                   1 - (c.embedding <=> $1) AS score
            FROM chunks c
            JOIN nodes  n ON n.id = c.node_id
            WHERE {where_sql}
            ORDER BY c.embedding <=> $1
            LIMIT ${len(args)}
            """,
            *args,
        )
    return [
        {**_format_unified(dict(r)), "node_id": int(r["id"]), "source_key": r["source_key"]}
        for r in rows
    ]


# --- search_all -----------------------------------------------------------


async def search_all(
    query: str, k: int = 10, source: str | None = None,
) -> dict[str, Any]:
    """Cross-source semantic search across Slack + Linear + GitHub.

    Pass `source` to scope to one of: "slack", "linear", "github". Without
    it, returns the top-k hits from the entire corpus.
    """
    type_filter: list[str] | None = None
    if source:
        if source not in _SOURCE_TYPES:
            raise ValueError(
                f"unknown source {source!r}; valid: {sorted(_SOURCE_TYPES)}"
            )
        type_filter = _SOURCE_TYPES[source]

    results = await _semantic_search(query, k=k, type_filter=type_filter)
    return {"query": query, "source_filter": source, "results": results}


# --- find_similar_incidents -----------------------------------------------


async def find_similar_incidents(symptom: str, k: int = 8) -> dict[str, Any]:
    """Find past incidents semantically similar to a symptom description.

    Searches:
      * Slack messages from `incident-*` channels (where on-call chatter lives)
      * Linear issues marked Done/Completed (resolved past incidents)
      * Linear comments (often where the RCA detail sits)

    Returns ranked hits with deep links. Use this when an agent asks
    "what do we know about <symptom>?" — it's the entry point to the
    incident knowledge graph.
    """
    # SQL filter: incident-flavored content only.
    # Note: $2 is the only extra arg here (the LIKE pattern); k is appended
    # automatically by _semantic_search.
    extra_sql = """
        (
          (n.type = 'slack_message' AND n.props->>'channel_name' LIKE $2)
          OR (n.type = 'linear_issue' AND n.props->>'state' IN ('Done','Completed','Cancelled'))
          OR n.type = 'linear_comment'
        )
    """
    results = await _semantic_search(
        symptom,
        k=k,
        extra_where_sql=extra_sql,
        extra_args=["incident-%"],
    )
    return {"symptom": symptom, "results": results}


# --- get_runbook ----------------------------------------------------------


async def get_runbook(topic: str, k: int = 3) -> dict[str, Any]:
    """Retrieve the most relevant runbook section(s) for a topic.

    Filters to GitHub doc_chunks whose file_path contains 'runbook'. Returns
    up to `k` matching sections, each with the file path + line range so the
    agent can cite exactly which part of which runbook applies.
    """
    extra_sql = """
        (
          n.type = 'doc_chunk'
          AND (n.props->>'file_path' ILIKE $2 OR n.props->>'file_path' ILIKE $3)
        )
    """
    results = await _semantic_search(
        topic,
        k=k,
        extra_where_sql=extra_sql,
        extra_args=["%/runbook%", "%runbook%.md"],
    )
    return {"topic": topic, "results": results}


# --- who_owns -------------------------------------------------------------


def _parse_codeowners(text: str) -> list[tuple[str, list[str]]]:
    """Parse a CODEOWNERS file into [(pattern, owners), ...] tuples.

    Comments and blank lines are skipped. Owners include the leading '@' so
    the agent can render them as-is.
    """
    rules: list[tuple[str, list[str]]] = []
    for raw in text.splitlines():
        line = raw.split("#", 1)[0].strip()
        if not line:
            continue
        parts = line.split()
        if len(parts) < 2:
            continue
        pattern, *owners = parts
        rules.append((pattern, owners))
    return rules


def _codeowners_match(pattern: str, path: str) -> bool:
    """Mimic the GitHub CODEOWNERS matching rules — close enough for the demo.

    GitHub's actual semantics are gitignore-flavored; we implement the most
    common forms: '*' (everything), exact path, leading '/' anchor, and
    '/dir/' (dir + everything below).
    """
    if pattern == "*":
        return True
    # Trailing slash means "this directory and below"
    if pattern.endswith("/"):
        return path == pattern.rstrip("/") or path.startswith(pattern)
    # Leading '/' is anchored to repo root (which is what we're matching anyway)
    p = pattern.lstrip("/")
    target = path.lstrip("/")
    if p == target:
        return True
    # Glob-ish: '*' inside a path segment
    if "*" in p:
        rx = re.escape(p).replace(r"\*", ".*")
        return re.match(rx + r"$", target) is not None
    # Treat bare paths as a directory prefix too (e.g. "/packages/auth/" matches
    # "packages/auth/src/foo.ts")
    if target.startswith(p.rstrip("/") + "/"):
        return True
    return False


async def who_owns(path: str, repo: str | None = None) -> dict[str, Any]:
    """Return the CODEOWNERS for a file path within an indexed GitHub repo.

    Reads CODEOWNERS from the local clone (the indexer keeps one per repo
    in `cfg.cache_dir`). Returns the most-specific matching rule's owners,
    plus the matched pattern, so the agent can cite both.
    """
    cfg = STATE.cfg
    assert cfg is not None
    owner, name = await _resolve_repo_slug(repo)
    repo_dir: Path = cfg.cache_dir / owner / name

    # CODEOWNERS may live at root, in /docs, or in /.github — same as
    # what GitHub itself supports.
    candidates = [
        repo_dir / "CODEOWNERS",
        repo_dir / ".github" / "CODEOWNERS",
        repo_dir / "docs" / "CODEOWNERS",
    ]
    src = next((p for p in candidates if p.exists()), None)
    if src is None:
        return {"path": path, "owners": [], "matched_pattern": None,
                "note": "no CODEOWNERS file found in the indexed clone"}

    rules = _parse_codeowners(src.read_text())

    # GitHub uses *last matching rule wins*. Walk in order and remember the
    # last one that matched.
    last_match: tuple[str, list[str]] | None = None
    for pattern, owners in rules:
        if _codeowners_match(pattern, path):
            last_match = (pattern, owners)

    if last_match is None:
        return {"path": path, "owners": [], "matched_pattern": None}
    return {
        "path": path,
        "matched_pattern": last_match[0],
        "owners": last_match[1],
    }


# --- diagnose_incident ----------------------------------------------------


async def create_slack_channel(
    name: str,
    topic: str | None = None,
    purpose: str | None = None,
    invite: list[str] | None = None,
    initial_message: str | None = None,
) -> dict[str, Any]:
    """Create a Slack channel and (optionally) seed it with a topic +
    invitees + opening message.

    Idempotent: if a channel with this name already exists, returns the
    existing channel's metadata instead of failing.

    Auto-invites whatever `DEMO_INVITE_USERS` resolves to in `.env`
    (Chetan + Henning by default) on top of any extras passed via `invite`.
    Good demo move: the AI agent spins up a fresh #incident-* channel
    on detection and pages the on-call rotation in one tool call.

    Args:
      name:    channel name (without leading #). Slack lower-cases.
      topic:   sets the channel topic (sev / status / one-line summary)
      purpose: sets the channel purpose (longer context)
      invite:  extra Slack user IDs to invite, on top of DEMO_INVITE_USERS
      initial_message: optional opening message posted by the bot

    Returns: {ok, name, channel_id, url, created (bool — false if it
    already existed), invited (list of user_ids), initial_message_ts}
    """
    cfg = STATE.cfg
    assert cfg is not None
    if not cfg.slack_bot_token:
        raise ValueError(
            "SLACK_BOT_TOKEN is not set in .env — needed for create_slack_channel",
        )

    # Build the invite list: DEMO_INVITE_USERS env + caller-supplied extras.
    # Both sources are optional; we only call invite_to_channel if we
    # end up with at least one user.
    import os
    raw_default = os.getenv("DEMO_INVITE_USERS") or os.getenv("DEMO_INVITE_USER") or ""
    default_ids = [u.strip() for u in raw_default.split(",") if u.strip()]
    invite_ids = list(dict.fromkeys(default_ids + (invite or [])))  # dedupe, preserve order

    from indexer.slack_fetcher import Slack, SlackError

    async with Slack(cfg.slack_bot_token) as sl:
        ws = await sl.workspace_ref()

        # create_channel() in slack_fetcher already handles the
        # name_taken case by returning the existing channel.
        existed_already = False
        try:
            channel = await sl.create_channel(name)
        except SlackError as e:
            raise ValueError(f"slack create_channel failed: {e.code}") from e

        # If it already had members > 1 we know we're not the first.
        # (Slack auto-adds the creating bot as the only initial member,
        # so num_members >= 2 means humans were already invited before.)
        existed_already = (channel.get("num_members") or 0) > 1

        if topic:
            try:
                await sl.set_channel_topic(channel["id"], topic)
            except SlackError as e:
                # Non-fatal — keep going if topic-setting fails.
                pass

        # Best-effort invites. Slack returns `already_in_channel` for
        # existing members, which our wrapper swallows.
        invited_ok: list[str] = []
        if invite_ids:
            try:
                await sl.invite_to_channel(channel["id"], invite_ids)
                invited_ok = invite_ids
            except SlackError as e:
                # Don't fail the whole call if invite fails — channel
                # exists, agent can retry. Surface in the response.
                pass

        initial_ts: str | None = None
        if initial_message:
            try:
                resp = await sl.post_message(channel["id"], initial_message)
                initial_ts = resp.get("ts")
            except SlackError:
                pass

    permalink = (
        f"https://{ws.team_domain}.slack.com/archives/{channel['id']}"
    )

    return {
        "ok": True,
        "name": channel.get("name", name),
        "channel_id": channel["id"],
        "url": permalink,
        "created": not existed_already,
        "invited": invited_ok,
        "initial_message_ts": initial_ts,
    }


async def post_to_slack(
    channel: str,
    text: str,
    thread_ts: str | None = None,
) -> dict[str, Any]:
    """Post a message back into a Slack channel.

    The demo finale: after `diagnose_incident` synthesizes context, the
    agent calls this to drop the answer into the active incident channel
    so the whole on-call team sees it — not just the person who asked.

    `channel` accepts either the human name (e.g. "incident-2026-05-auth-down",
    leading '#' optional) or the raw Slack channel ID (e.g. "C0B1XQN2D34").
    Names are resolved against the `slack_channel` nodes in the index — so
    only channels we've already ingested are addressable, which is what we
    want (no accidental posts to random workspace channels).

    Returns `{ok, channel, channel_id, ts, url}` so the agent can include
    the resulting permalink in its reply.
    """
    cfg = STATE.cfg
    pool = STATE.pool
    assert cfg is not None and pool is not None
    if not cfg.slack_bot_token:
        raise ValueError(
            "SLACK_BOT_TOKEN is not set in .env — needed for post_to_slack",
        )

    # Resolve channel name → ID against the indexed slack_channel nodes.
    # This intentionally rejects channels we haven't ingested, so the
    # tool can't post into arbitrary workspace channels.
    raw = channel.lstrip("#").strip()
    if raw.startswith("C") and raw.isalnum() and len(raw) > 8:
        channel_id = raw
    else:
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT props->>'id' AS id, props->>'name' AS name
                FROM nodes
                WHERE type = 'slack_channel'
                  AND props->>'name' = $1
                """,
                raw,
            )
        if not row:
            raise ValueError(
                f"Slack channel #{raw!r} is not in the index — "
                f"only ingested channels are addressable. Re-run "
                f"`python -m indexer slack` if you've added new ones.",
            )
        channel_id = row["id"]

    # Lazy-import to avoid pulling httpx into the import path of every
    # MCP tool call when SLACK_BOT_TOKEN isn't configured.
    from indexer.slack_fetcher import Slack

    async with Slack(cfg.slack_bot_token) as sl:
        ws = await sl.workspace_ref()
        resp = await sl.post_message(channel_id, text, thread_ts=thread_ts)

    ts = resp.get("ts", "")
    permalink = (
        f"https://{ws.team_domain}.slack.com/archives/{channel_id}"
        f"/p{ts.replace('.', '')}"
        if ts else None
    )

    return {
        "ok": True,
        "channel": raw,
        "channel_id": channel_id,
        "ts": ts,
        "url": permalink,
        "thread_ts": thread_ts,
    }


# --- Linear write tools ---------------------------------------------------
# Used by the demo flow to: (a) open an incident tracking ticket, (b) push
# status updates onto it as work progresses, (c) close it out with the
# final RCA. Each tool fails fast if LINEAR_API_KEY isn't set.


async def _resolve_linear_team(ln, team_key: str | None) -> dict:
    """Pick a Linear team — either the one matching `team_key` or the
    first team the API key can see. Raises if nothing matches.
    """
    selected: dict | None = None
    available: list[str] = []
    async for team in ln.teams():
        available.append(team.get("key", "?"))
        if team_key:
            if team.get("key") == team_key:
                return team
        elif selected is None:
            selected = team
    if team_key:
        raise ValueError(
            f"Linear team {team_key!r} not found. Available: {', '.join(available) or '(none)'}"
        )
    if selected is None:
        raise ValueError("no Linear teams accessible by this API key")
    return selected


async def create_linear_issue(
    title: str,
    description: str,
    priority: int = 2,
    team_key: str | None = None,
    state: str = "In Progress",
) -> dict[str, Any]:
    """Create a Linear incident tracking ticket.

    The demo flow calls this once an incident is being actively worked
    on, so the on-call rotation has a single tracking artifact. Pass the
    synthesized context from `diagnose_incident` as the description.

    `priority`: 0 none, 1 urgent, 2 high (default), 3 normal, 4 low.
    `state`: defaults to "In Progress"; falls back to whatever
    started-typed state the team has if the exact name isn't present.
    """
    cfg = STATE.cfg
    assert cfg is not None
    if not cfg.linear_api_key:
        raise ValueError(
            "LINEAR_API_KEY is not set in .env — needed for create_linear_issue",
        )

    from indexer.linear_fetcher import Linear

    async with Linear(cfg.linear_api_key) as ln:
        team = await _resolve_linear_team(ln, team_key)
        state_id = await ln.state_id_for(team_id=team["id"], state_name=state)
        issue = await ln.create_issue(
            team_id=team["id"],
            title=title,
            description=description,
            priority=priority,
            state_id=state_id,
        )

    return {
        "ok": True,
        "identifier": issue["identifier"],
        "title": issue["title"],
        "url": issue["url"],
        "state": (issue.get("state") or {}).get("name"),
        "priority": issue.get("priority"),
        "team": (issue.get("team") or {}).get("key"),
    }


async def add_linear_comment(identifier: str, body: str) -> dict[str, Any]:
    """Append a comment to a Linear issue.

    Use this to push status updates onto an incident ticket as the
    investigation progresses — *"rolled back to v1.20.4"*, *"hotfix
    PR #1241 shipped"*, *"final RCA: …"*. Markdown supported.

    `identifier` is the human form, e.g. 'CLI-5' or 'cli-5'.
    """
    cfg = STATE.cfg
    assert cfg is not None
    if not cfg.linear_api_key:
        raise ValueError(
            "LINEAR_API_KEY is not set in .env — needed for add_linear_comment",
        )

    from indexer.linear_fetcher import Linear

    async with Linear(cfg.linear_api_key) as ln:
        issue = await ln.find_issue_by_identifier(identifier)
        if not issue:
            raise ValueError(
                f"Linear issue {identifier!r} not found — "
                f"check the identifier (e.g. 'CLI-5')."
            )
        comment = await ln.create_comment(issue_id=issue["id"], body=body)

    return {
        "ok": True,
        "identifier": issue["identifier"],
        "issue_url": issue.get("url"),
        "comment_url": comment.get("url"),
    }


async def update_linear_issue(
    identifier: str,
    state: str | None = None,
    priority: int | None = None,
    description: str | None = None,
    title: str | None = None,
) -> dict[str, Any]:
    """Update fields on an existing Linear issue.

    The demo's most common use: mark an incident resolved by calling
    with `state="Done"` (and optionally a final summary in
    `description`). Pass only the fields you want to change.
    """
    cfg = STATE.cfg
    assert cfg is not None
    if not cfg.linear_api_key:
        raise ValueError(
            "LINEAR_API_KEY is not set in .env — needed for update_linear_issue",
        )

    if state is None and priority is None and description is None and title is None:
        raise ValueError(
            "update_linear_issue: pass at least one of state/priority/description/title",
        )

    from indexer.linear_fetcher import Linear

    async with Linear(cfg.linear_api_key) as ln:
        issue = await ln.find_issue_by_identifier(identifier)
        if not issue:
            raise ValueError(f"Linear issue {identifier!r} not found")

        state_id: str | None = None
        if state is not None:
            team_id = (issue.get("team") or {}).get("id")
            if not team_id:
                raise ValueError(
                    f"could not resolve team for {identifier!r} — "
                    f"can't change state without it"
                )
            state_id = await ln.state_id_for(team_id=team_id, state_name=state)
            if not state_id:
                raise ValueError(
                    f"no state matching {state!r} found in team — "
                    f"try 'In Progress', 'Done', 'Backlog', etc."
                )

        updated = await ln.update_issue(
            issue_id=issue["id"],
            state_id=state_id,
            priority=priority,
            description=description,
            title=title,
        )

    return {
        "ok": True,
        "identifier": updated["identifier"],
        "url": updated.get("url"),
        "state": (updated.get("state") or {}).get("name"),
        "priority": updated.get("priority"),
        "title": updated.get("title"),
    }


async def diagnose_incident(symptom: str) -> dict[str, Any]:
    """Composite tool — the demo's headline call.

    Given a symptom (e.g. "auth is throwing 401s after deploy"), returns
    everything an on-call engineer needs in their first 60 seconds:

      * Similar past incidents (Slack threads + Linear tickets)
      * The matching runbook section(s) from GitHub
      * Best-effort code owners for the affected area (parsed from
        CODEOWNERS in the indexed repo, when the symptom suggests a
        clear path)

    The agent typically calls this tool *first*, then drills into specific
    citations using `get_node` / `get_pr_diff` / `git_blame` if needed.
    """
    similar = await find_similar_incidents(symptom, k=6)
    runbook = await get_runbook(symptom, k=2)

    # Best-effort owner lookup: pick a path hint from the top-matching
    # runbook (if any). Skipped silently if no repo is indexed or the
    # runbook hit doesn't have one.
    owners_block: dict[str, Any] | None = None
    top_runbook = (runbook.get("results") or [None])[0]
    if top_runbook and top_runbook.get("metadata", {}).get("file_path"):
        path = top_runbook["metadata"]["file_path"]
        try:
            owners_block = await who_owns(path)
        except Exception:
            # Owners is a nice-to-have; don't fail the whole diagnosis if
            # the repo isn't indexed or there's no CODEOWNERS.
            owners_block = None

    return {
        "symptom": symptom,
        "similar_incidents": similar["results"],
        "runbook": runbook["results"],
        "owners": owners_block,
    }
