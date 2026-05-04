# ctx-mcp — Intelligent Context Navigation for Developer Knowledge

A proof-of-concept MCP server that turns a GitHub repo into a navigable
knowledge layer for AI agents. It indexes **code**, **issues**, **pull
requests**, **commits**, and **comments** into a hybrid **knowledge graph
+ vector store**, then exposes context-retrieval tools over MCP/stdio.

**Headline use case:** point an agent at a bug report and it traces from the
issue → the most semantically-relevant code → the recent PRs that touched
that code → the commit that introduced the regression → a proposed fix.

## Architecture at a glance

```
Cline (VS Code) — chat model: any Claude on OpenRouter
        │ (MCP, stdio)
        ▼
mcp_server/   (Python, mcp SDK)
  tools: search_context, get_node, get_neighbors,
         trace_issue, git_blame, get_pr_diff, list_repos
        │
        ▼
Postgres + pgvector
  nodes (issue, pr, commit, file, symbol, author, comment, doc_chunk)
  edges (fixes, modifies, authored_by, references, mentions, on,
         defined_in, last_modified_by, part_of)
  chunks(node_id, text, embedding vector(512))   ← Voyage voyage-3-lite
        ▲
        │ one-shot
indexer/  (CLI: python -m indexer <repo>)
  github_fetcher · parser · graph_builder · embedder
```

The semantic layer (chunks) and the structural layer (nodes/edges) live in
the same Postgres so a single query can mix kNN with graph traversal.

## Quickstart

1. **Bring up Postgres + pgvector**

   ```sh
   docker compose up -d postgres
   ```

   The schema in `db/schema.sql` is loaded automatically on first boot.

2. **Set up Python**

   ```sh
   python -m venv .venv && source .venv/bin/activate
   pip install -e .
   cp .env.example .env
   # edit .env: GITHUB_TOKEN, VOYAGE_API_KEY
   ```

3. **Index a repo**

   ```sh
   python -m indexer https://github.com/<owner>/<name>
   ```

   Re-running is idempotent (upserts on natural keys). Rate-limit tip: on
   Voyage's free tier the default is 3 RPM; adding a billing method on the
   dashboard lifts it to 2000 RPM at no cost — recommended for any repo
   bigger than ~300 chunks.

4. **Wire the MCP server into Cline**

   In VS Code, install the **Cline** extension. Open Cline → ⚙️ → "MCP
   Servers" → "Edit Settings" (or directly edit
   `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`):

   ```json
   {
     "mcpServers": {
       "ctx": {
         "command": "/absolute/path/to/hackathon-mcp/.venv/bin/python",
         "args": ["-m", "mcp_server"],
         "cwd": "/absolute/path/to/hackathon-mcp",
         "disabled": false,
         "autoApprove": ["search_context", "get_node", "get_neighbors", "list_repos", "trace_issue", "get_pr_diff", "git_blame"]
       }
     }
   }
   ```

   Set Cline's **API Provider** to **OpenRouter**, paste your OpenRouter
   key, and pick a Claude model (e.g. `anthropic/claude-sonnet-4.5`). Now
   the chat model lives on OpenRouter; the MCP tools come from this repo.

   *Same JSON shape works for Claude Desktop if you ever want to switch —
   just put it in `~/Library/Application Support/Claude/claude_desktop_config.json`.*

5. **Demo prompt** (paste into Cline)

   > Use the `ctx` MCP server. Investigate issue #N in `<owner>/<name>` —
   > call `trace_issue` first, then drill into suspect PRs with `git_blame`
   > and `get_pr_diff`, and propose a fix.

## Web demo (chat + live graph)

A single page where the agent (via OpenRouter) talks to the same MCP
tools, with the knowledge graph rendered next to the chat. As the
agent calls tools, the touched nodes pulse on the graph — you can
literally watch it navigate.

Add to `.env`:

```
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=anthropic/claude-sonnet-4.5
```

Two terminals (postgres should already be up and a repo indexed):

```sh
# A — FastAPI backend
source .venv/bin/activate
python -m api          # http://localhost:8765

# B — Next.js frontend
cd frontend
pnpm install           # first time only
pnpm dev               # http://localhost:3000
```

Open `http://localhost:3000`. The frontend proxies `/api/*` to the
FastAPI backend. The MCP server (`python -m mcp_server`) keeps
working in parallel for Cline / Claude Desktop users.

## Tools exposed over MCP

| Tool | Purpose |
| --- | --- |
| `search_context(query, types?, k=10, repo?)` | kNN over chunks, optional type filter. |
| `get_node(id)` | Full node row + chunks. |
| `get_neighbors(id, edge_types?, depth=1, direction="both")` | Recursive graph walk. |
| `trace_issue(issue_number, repo?, k=8)` | Issue → suspect code → recent PRs touching it. |
| `git_blame(file_path, line_start, line_end?, repo?)` | Run blame on the local clone, enrich with PR/commit nodes. |
| `get_pr_diff(pr_number, repo?)` | PR metadata + per-file patches. |
| `list_repos()` | What's indexed and how much. |

## Layout

```
indexer/           — CLI: clone → walk → fetch GitHub → embed → upsert
mcp_server/        — FastMCP stdio server exposing the tools
db/schema.sql      — nodes / edges / chunks / repos
docker-compose.yml — postgres+pgvector
pyproject.toml     — Python deps (mcp, asyncpg, pgvector, httpx, …)
```

## Why Voyage for embeddings?

OpenRouter is great for chat completions but doesn't support embeddings
reliably. Voyage AI gives us a 200M-token-per-month free tier, the
`voyage-3-lite` model is competitive with the larger OpenAI offerings, and
its `input_type` (document vs query) gives a measurable retrieval boost on
mixed code+prose corpora.
