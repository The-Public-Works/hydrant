"""Dispatch tool calls from the LLM into the existing mcp_server.tools.* funcs.

After each call, walks the result to collect any node ids the agent touched,
so the frontend graph can highlight them in real time.
"""

from __future__ import annotations

import json
from typing import Any

from mcp_server import tools as mcp_tools


_TOOLS = {
    "list_repos": mcp_tools.list_repos,
    "search_context": mcp_tools.search_context,
    "get_node": mcp_tools.get_node,
    "get_neighbors": mcp_tools.get_neighbors,
    "trace_issue": mcp_tools.trace_issue,
    "git_blame": mcp_tools.git_blame,
    "get_pr_diff": mcp_tools.get_pr_diff,
}

# Keys whose values are node IDs we want to highlight in the graph.
# Edge endpoints (src/dst) are intentionally excluded — they balloon the
# highlight set on get_neighbors and aren't "primary" results of the tool.
_ID_KEYS = {"id", "node_id", "modified_file_id", "issue_id"}

# Cap highlighted ids per tool call so a single broad query (e.g. get_neighbors
# at depth=2) doesn't flash most of the visible graph at once.
_MAX_HIGHLIGHT_IDS = 25

# Cap each tool result so the agent loop can't blow Claude's 200k context
# after a few calls. Empirically ~32k chars (~8k tokens) per tool result keeps
# headroom for several rounds of tool use.
_MAX_RESULT_CHARS = 32_000
_MAX_STRING_CHARS = 4_000


def _collect_node_ids(obj: Any, out: set[int]) -> None:
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k in _ID_KEYS and isinstance(v, int):
                out.add(v)
            else:
                _collect_node_ids(v, out)
    elif isinstance(obj, list):
        for item in obj:
            _collect_node_ids(item, out)


def _shrink_strings(obj: Any, limit: int) -> Any:
    if isinstance(obj, str):
        return obj if len(obj) <= limit else obj[: limit - 1] + "…"
    if isinstance(obj, dict):
        return {k: _shrink_strings(v, limit) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_shrink_strings(v, limit) for v in obj]
    return obj


def _cap_result(result: Any) -> Any:
    """If the JSON-serialized result exceeds the budget, shrink long strings;
    if still over, return a truncation envelope so the LLM gets a coherent
    signal instead of a malformed blob."""
    payload = json.dumps(result, default=str)
    if len(payload) <= _MAX_RESULT_CHARS:
        return result
    shrunk = _shrink_strings(result, _MAX_STRING_CHARS)
    payload = json.dumps(shrunk, default=str)
    if len(payload) <= _MAX_RESULT_CHARS:
        return shrunk
    return {
        "_truncated": True,
        "note": (
            f"Tool result was {len(payload)} chars; exceeded "
            f"{_MAX_RESULT_CHARS}-char budget. Preview only — call a more "
            "specific tool (e.g. get_node, get_pr_diff for one PR) to drill in."
        ),
        "preview": payload[: _MAX_RESULT_CHARS - 500],
    }


async def invoke(name: str, args: dict[str, Any]) -> tuple[Any, list[int]]:
    fn = _TOOLS.get(name)
    if fn is None:
        return ({"error": f"unknown tool {name!r}"}, [])
    try:
        result = await fn(**args)
    except Exception as e:  # noqa: BLE001
        return ({"error": f"{type(e).__name__}: {e}"}, [])
    ids: set[int] = set()
    _collect_node_ids(result, ids)
    return _cap_result(result), sorted(ids)[:_MAX_HIGHLIGHT_IDS]
