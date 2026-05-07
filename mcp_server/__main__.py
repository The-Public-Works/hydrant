"""MCP stdio server.

Run via: `python -m mcp_server`

Wire into Claude Desktop with:
{
  "mcpServers": {
    "ctx": {
      "command": "python",
      "args": ["-m", "mcp_server"],
      "cwd": "/path/to/hackathon-mcp",
      "env": { "DATABASE_URL": "...", "GITHUB_TOKEN": "...", "OPENAI_API_KEY": "..." }
    }
  }
}
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from mcp.server.fastmcp import FastMCP

from . import tools as T
from .state import STATE

log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastMCP) -> AsyncIterator[None]:
    await STATE.startup()
    log.info("ctx-mcp ready")
    try:
        yield
    finally:
        await STATE.shutdown()


mcp = FastMCP("ctx-mcp", lifespan=lifespan)


@mcp.tool()
async def search_context(
    query: str, types: list[str] | None = None, k: int = 10, repo: str | None = None,
) -> dict:
    """Hybrid semantic search across the indexed knowledge graph.

    Embeds `query` and returns the top-k nearest chunks. Optionally filter by
    node `types` (any of: issue, pr, commit, file, symbol, doc_chunk, comment).
    Pass `repo` as `owner/name` if more than one repo is indexed.
    """
    return await T.search_context(query=query, types=types, k=k, repo=repo)


@mcp.tool()
async def get_node(id: int) -> dict:
    """Fetch a node by id, including its props and any text chunks."""
    return await T.get_node(id=id)


@mcp.tool()
async def get_neighbors(
    id: int, edge_types: list[str] | None = None, depth: int = 1, direction: str = "both",
) -> dict:
    """Walk the graph from a node up to `depth` hops.

    `edge_types` filters to specific relations (e.g. ["modifies","fixes"]).
    `direction` is one of: "out" (node→x), "in" (x→node), "both".
    """
    return await T.get_neighbors(id=id, edge_types=edge_types, depth=depth, direction=direction)


@mcp.tool()
async def trace_issue(issue_number: int, repo: str | None = None, k: int = 8) -> dict:
    """Headline tool for the debugging flow.

    Given an issue number, returns the issue, the most semantically-relevant
    code (files / symbols / docs) in the repo, recent PRs that modified those
    suspect files (sorted newest-first by merge date), and any PR already
    marked as fixing the issue. Enough context for the agent to identify the
    PR that introduced a regression and propose a fix.
    """
    return await T.trace_issue(issue_number=issue_number, repo=repo, k=k)


@mcp.tool()
async def git_blame(
    file_path: str, line_start: int, line_end: int | None = None, repo: str | None = None,
) -> dict:
    """Run git blame on the indexed local clone and join each unique commit
    against the indexed knowledge graph (commit node + linked PR if any)."""
    return await T.git_blame(
        file_path=file_path, line_start=line_start, line_end=line_end, repo=repo,
    )


@mcp.tool()
async def get_pr_diff(pr_number: int, repo: str | None = None) -> dict:
    """Return PR metadata plus the list of file changes (with truncated patches)."""
    return await T.get_pr_diff(pr_number=pr_number, repo=repo)


@mcp.tool()
async def list_repos() -> dict:
    """List repos that have been indexed, with per-type node counts."""
    return await T.list_repos()


# ---------------------------------------------------------------------------
# Cross-source tools (Slack + Linear + GitHub) — the demo flow.
# ---------------------------------------------------------------------------


@mcp.tool()
async def search_all(
    query: str, k: int = 10, source: str | None = None,
) -> dict:
    """Cross-source semantic search across Slack + Linear + GitHub.

    Returns the top-k most relevant chunks from the entire indexed corpus.
    Pass `source` to scope to one of: "slack", "linear", "github". Each
    result has a unified shape: {source, type, title, url, snippet, score, metadata}.
    """
    return await T.search_all(query=query, k=k, source=source)


@mcp.tool()
async def find_similar_incidents(symptom: str, k: int = 8) -> dict:
    """Find past incidents (Slack threads + Linear tickets) similar to a symptom.

    Use this when an on-call engineer asks "have we seen this before?" — it
    pulls back conversations from `incident-*` Slack channels and resolved
    Linear tickets, ranked by semantic similarity to the symptom description.
    """
    return await T.find_similar_incidents(symptom=symptom, k=k)


@mcp.tool()
async def get_runbook(topic: str, k: int = 3) -> dict:
    """Retrieve runbook section(s) from the indexed GitHub docs that match a topic.

    Returns up to `k` matching runbook chunks with file path + line range,
    so the agent can cite which exact section applies.
    """
    return await T.get_runbook(topic=topic, k=k)


@mcp.tool()
async def who_owns(path: str, repo: str | None = None) -> dict:
    """Return CODEOWNERS for a file path within an indexed GitHub repo.

    Implements GitHub's "last matching rule wins" semantics. Returns the
    matched pattern + the list of owners (handles or team names) so the
    agent can cite both.
    """
    return await T.who_owns(path=path, repo=repo)


@mcp.tool()
async def diagnose_incident(symptom: str) -> dict:
    """Composite — the demo's headline call.

    Given a symptom, returns: similar past incidents from Slack + Linear,
    the matching runbook section(s), and (best-effort) the code owners for
    the affected area. Call this first; drill into specifics with the
    other tools afterward.
    """
    return await T.diagnose_incident(symptom=symptom)


@mcp.tool()
async def post_to_slack(
    channel: str,
    text: str,
    thread_ts: str | None = None,
) -> dict:
    """Post a message back into a Slack channel — the demo finale.

    `channel` accepts a name (e.g. "incident-2026-05-auth-down") or a
    Slack channel ID. Names are resolved against indexed slack_channel
    nodes, so you can only post to channels that have been ingested.

    Use Slack's mrkdwn flavor for formatting:
      *bold*, _italic_, ~strike~, `code`,
      <https://example.com|link label>, <#C1234|channel>, <@U567>

    Pass `thread_ts` to post as a thread reply instead of a top-level
    message. Returns `{ok, channel, channel_id, ts, url}` — quote the
    `url` so the user can click through to the posted message.
    """
    return await T.post_to_slack(channel=channel, text=text, thread_ts=thread_ts)


# ---------------------------------------------------------------------------
# Linear write tools — open + maintain incident tickets.
# ---------------------------------------------------------------------------


@mcp.tool()
async def create_linear_issue(
    title: str,
    description: str,
    priority: int = 2,
    team_key: str | None = None,
    state: str = "In Progress",
) -> dict:
    """Create a Linear incident tracking ticket.

    Use this once an incident is being actively worked on so the on-call
    rotation has a single tracking artifact. Pass the synthesized
    context from `diagnose_incident` as the `description`. Returns the
    new ticket's identifier (e.g. 'CLI-9') and URL — quote the URL in
    your reply.

    Args:
      title: short headline (e.g. 'Auth 401s after deploy — incident-2026-05-auth-down')
      description: full markdown body with citations
      priority: 0 none, 1 urgent, 2 high (default), 3 normal, 4 low
      team_key: e.g. 'CLI' — defaults to the first team this token can see
      state:    'In Progress' (default), 'Triage', 'Todo', etc.
    """
    return await T.create_linear_issue(
        title=title, description=description,
        priority=priority, team_key=team_key, state=state,
    )


@mcp.tool()
async def add_linear_comment(identifier: str, body: str) -> dict:
    """Append a comment to a Linear issue.

    Use this to push status updates onto an incident ticket as the
    investigation progresses — *"rolled back v1.21"*, *"hotfix shipped
    in PR #1241"*, *"all clear"*. Markdown supported.

    `identifier` is the human form like 'CLI-5' (case-insensitive).
    """
    return await T.add_linear_comment(identifier=identifier, body=body)


@mcp.tool()
async def update_linear_issue(
    identifier: str,
    state: str | None = None,
    priority: int | None = None,
    description: str | None = None,
    title: str | None = None,
) -> dict:
    """Update fields on an existing Linear issue.

    Most common demo use: mark an incident resolved with
    `update_linear_issue("CLI-9", state="Done")`. Pass only the fields
    you want to change. State name resolution falls back by type
    (so 'Done' works even if the team calls it 'Completed').
    """
    return await T.update_linear_issue(
        identifier=identifier, state=state,
        priority=priority, description=description, title=title,
    )


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s - %(message)s",
    )
    mcp.run()  # stdio by default


if __name__ == "__main__":
    main()
