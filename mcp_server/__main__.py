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


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s - %(message)s",
    )
    mcp.run()  # stdio by default


if __name__ == "__main__":
    main()
