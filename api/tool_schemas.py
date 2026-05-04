"""OpenAI-shape JSON schemas for the MCP tools, used in the OpenRouter
tool-use loop. Mirrors the signatures + docstrings in mcp_server/tools.py."""

TOOLS: list[dict] = [
    {
        "type": "function",
        "function": {
            "name": "list_repos",
            "description": "List repos that have been indexed and basic per-type node counts.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_context",
            "description": (
                "Hybrid kNN over chunks (semantic search across code, docs, "
                "issues, PRs, commits, comments). Embeds the query and returns "
                "the top-k most relevant nodes. Optional type filter."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Natural-language search query."},
                    "types": {
                        "type": "array",
                        "items": {
                            "type": "string",
                            "enum": [
                                "issue", "pr", "commit", "comment",
                                "file", "symbol", "doc_chunk", "author",
                            ],
                        },
                        "description": "Optional list of node types to restrict the search to.",
                    },
                    "k": {"type": "integer", "default": 10, "minimum": 1, "maximum": 50},
                    "repo": {
                        "type": "string",
                        "description": "owner/name slug. Optional if exactly one repo is indexed.",
                    },
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_node",
            "description": "Fetch a single node by id, including all its embedded chunks.",
            "parameters": {
                "type": "object",
                "properties": {"id": {"type": "integer"}},
                "required": ["id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_neighbors",
            "description": (
                "Walk the knowledge graph from a node up to `depth` hops. "
                "Returns the visited nodes and the edges connecting them."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "edge_types": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": (
                            "Optional edge-type filter: fixes, modifies, authored_by, "
                            "references, mentions, on, defined_in, last_modified_by, part_of."
                        ),
                    },
                    "depth": {"type": "integer", "default": 1, "minimum": 1, "maximum": 4},
                    "direction": {"type": "string", "enum": ["out", "in", "both"], "default": "both"},
                },
                "required": ["id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "trace_issue",
            "description": (
                "Headline tool: given a GitHub issue number, returns the issue, "
                "the closest code in the repo (semantic), recent PRs that "
                "modified that code, and any PRs that already claim to fix it. "
                "Use this to start root-causing a bug report."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "issue_number": {"type": "integer"},
                    "repo": {"type": "string", "description": "owner/name slug. Optional if one repo indexed."},
                    "k": {"type": "integer", "default": 8, "minimum": 1, "maximum": 30},
                },
                "required": ["issue_number"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "git_blame",
            "description": (
                "Run git blame on the local clone for a file/line range. Each "
                "unique commit is enriched with its node row and any linked PR."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {"type": "string"},
                    "line_start": {"type": "integer", "minimum": 1},
                    "line_end": {"type": "integer"},
                    "repo": {"type": "string"},
                },
                "required": ["file_path", "line_start"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_pr_diff",
            "description": "PR metadata + per-file modifies edges (with truncated patches).",
            "parameters": {
                "type": "object",
                "properties": {
                    "pr_number": {"type": "integer"},
                    "repo": {"type": "string"},
                },
                "required": ["pr_number"],
            },
        },
    },
]
