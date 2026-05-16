<div align="center">

# 🚒 Hydrant

**AI knowledge layer for incident response.**
*Open-source · MCP-native · Cited by design.*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org)
[![MCP Native](https://img.shields.io/badge/MCP-Native-7E57C2.svg)](https://modelcontextprotocol.io)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen.svg)](CONTRIBUTING.md)

**[Watch the 2-minute demo →](https://thehydrant.dev)** · [Quickstart](#-quickstart-5-minutes) · [Tools](#-what-you-get) · [Wire into your AI client](#-wire-it-into-your-ai-client) · [Contributing](CONTRIBUTING.md)

</div>

---

## What it does

When production breaks at 2 a.m., the on-call engineer spends the next 25 minutes hunting through **Slack threads, Linear tickets, GitHub PRs, runbooks, and CODEOWNERS** for *what already happened the last time this broke*.

Hydrant turns that into a single prompt.

It indexes your team's incident knowledge across multiple sources, exposes them through an MCP server, and lets any AI agent (Cline, Claude Code, Claude Desktop) answer questions like:

> *"Auth is throwing 401s on prod after a deploy. Diagnose it, open a tracking ticket, and post the summary to `#incident-…`."*

…in ~2 minutes end-to-end, with **every claim citing a clickable source URL**. No black-box answers.

<!--
Add a hero gif/video here once the demo recording is uploaded:
![Hydrant demo](docs/img/demo.gif)
-->

---

## ✨ Why use Hydrant

|  | Hydrant | Closed alternatives |
|---|---|---|
| Cross-source synthesis (Slack + Linear + GitHub) | ✅ | Often telemetry-only |
| Every answer has clickable citations | ✅ | Mostly black-box |
| Runs inside your AI client of choice | ✅ | Standalone app you have to switch to |
| Posts the synthesis *back* to your incident channel | ✅ | Answer dies in their app |
| Self-hosted (your data, your DB) | ✅ | SaaS only |
| Open source | ✅ MIT | ❌ |

---

## 🚀 Quickstart (5 minutes)

The fastest path to the "wow" moment — just GitHub. Slack + Linear are optional and additive.

```bash
# 1. Clone
git clone https://github.com/the-public-works/hydrant && cd hydrant

# 2. Start Postgres + pgvector
docker compose up -d postgres

# 3. Configure 3 keys
cp .env.example .env
#    edit .env:
#      DATABASE_URL=postgresql://ctx:ctx@localhost:5432/ctx
#      GITHUB_TOKEN=ghp_…           (https://github.com/settings/tokens — public_repo)
#      VOYAGE_API_KEY=pa-…          (https://voyageai.com — free tier; see note ↓)

# 4. Install + index a repo
python -m venv .venv && source .venv/bin/activate
pip install -e .
python -m indexer github <owner>/<repo>

# 5. Verify the MCP server boots
./bin/run-mcp.sh
#    expect: "hydrant ready" on stderr, then exits when you Ctrl-C
```

That's it. Now wire it into your AI client — pick one below.

> **Voyage free-tier gotcha:** the default rate limit is 3 requests per minute. Add a payment method on [voyageai.com](https://voyageai.com) — they won't charge you — and the limit jumps to 2,000 RPM. Indexing a real repo at 3 RPM takes ~hour; at 2,000 RPM it's ~2 minutes.

---

## 🧠 What you get

**17 MCP tools** organized into four families:

<details>
<summary><strong>Cross-source synthesis (5 tools)</strong></summary>

| Tool | What it returns |
|---|---|
| `diagnose_incident(symptom)` | Composite call: similar past incidents + matching runbook + likely owner. Start here. |
| `find_similar_incidents(symptom)` | Past incidents (Slack channels + Linear tickets) ranked by semantic similarity |
| `get_runbook(topic)` | Matching runbook sections from your GitHub docs |
| `who_owns(path)` | CODEOWNERS lookup with last-rule-wins semantics |
| `search_all(query, source?)` | Cross-source kNN — pass `source` to scope to slack / linear / github |

</details>

<details>
<summary><strong>GitHub-flavored (7 tools)</strong></summary>

| Tool | What it returns |
|---|---|
| `trace_issue(issue_number)` | Issue → suspect code → recent PRs touching that code |
| `get_pr_diff(pr_number)` | PR metadata + per-file diff |
| `git_blame(path, line_start, line_end?)` | Blame for those lines, enriched with the indexed commit/PR nodes |
| `get_node(id)` / `get_neighbors(id)` | Direct graph access |
| `search_context(query, types?)` | kNN scoped to a single repo |
| `list_repos()` | What's indexed and how much |

</details>

<details>
<summary><strong>Slack write (2 tools)</strong></summary>

| Tool | What it does |
|---|---|
| `create_slack_channel(name, topic?, purpose?, invite?, initial_message?)` | Spin up `#incident-…` on demand, optionally with the synthesis pre-posted |
| `post_to_slack(channel, text, thread_ts?)` | Post into an indexed channel (by name or ID) |

</details>

<details>
<summary><strong>Linear write (3 tools)</strong></summary>

| Tool | What it does |
|---|---|
| `create_linear_issue(title, description, priority?, state?)` | Open a tracking ticket with full markdown body |
| `add_linear_comment(issue_id, body)` | Comment on an existing ticket |
| `update_linear_issue(issue_id, state?, priority?, …)` | Move state, change priority |

</details>

---

## 🔌 Wire it into your AI client

Pick whichever client you use — Hydrant works the same way through all of them.

<details>
<summary><strong>Claude Code</strong> — zero-config</summary>

Already done. The `.mcp.json` at the project root is auto-detected on session start. Just `cd` into the repo and Claude Code will prompt to approve the `hydrant` server.

To reload after editing: type `/mcp` in Claude Code.

</details>

<details>
<summary><strong>Cline (VS Code extension)</strong></summary>

Install **Cline** in VS Code → click ⚙️ → "MCP Servers" → "Edit Settings", or edit directly:

```
~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
```

Add this block (swap in your absolute path):

```json
{
  "mcpServers": {
    "hydrant": {
      "command": "/absolute/path/to/hydrant/bin/run-mcp.sh",
      "args": [],
      "disabled": false,
      "autoApprove": [
        "search_all", "find_similar_incidents", "get_runbook",
        "who_owns", "diagnose_incident",
        "search_context", "get_node", "get_neighbors", "list_repos",
        "trace_issue", "get_pr_diff", "git_blame",
        "create_slack_channel", "post_to_slack",
        "create_linear_issue", "add_linear_comment", "update_linear_issue"
      ]
    }
  }
}
```

Set Cline's **API Provider** to OpenRouter or Anthropic. Pick a Claude model (Sonnet 4.5 is great for tool calling).

</details>

<details>
<summary><strong>Claude Desktop</strong></summary>

```bash
open "$HOME/Library/Application Support/Claude/claude_desktop_config.json"
```

Paste the same `mcpServers.hydrant` block as above. Restart Claude Desktop.

</details>

### Try it

Paste this into your AI client of choice:

> *"Use the `hydrant` MCP server. Diagnose this incident: 'auth is throwing 401s after a deploy.' Cite the most relevant Slack thread, Linear ticket, and runbook section by URL."*

If the indexed repo has matching content, you'll see `diagnose_incident` fire and the model synthesize a cited answer.

---

## 📡 Add more sources

The GitHub quickstart is the floor. Hydrant gets dramatically more useful with Slack + Linear plugged in.

<details>
<summary><strong>Slack</strong></summary>

Create a Slack app at [api.slack.com/apps](https://api.slack.com/apps) → add the bot scopes:

```
channels:read         channels:history
users:read            users:read.email
channels:manage       chat:write
chat:write.customize  chat:write.public
groups:read           groups:history    (for private channels)
```

Install to your workspace and copy the **Bot User OAuth Token** (starts `xoxb-`):

```bash
# .env
SLACK_BOT_TOKEN=xoxb-…

# Invite the bot to channels you want indexed, then:
python -m indexer slack --channels 'incident-*'
```

</details>

<details>
<summary><strong>Linear</strong></summary>

Generate a personal API key at [linear.app/settings/api](https://linear.app/settings/api):

```bash
# .env
LINEAR_API_KEY=lin_api_…

python -m indexer linear --teams ENG
```

</details>

<details>
<summary><strong>Notion (alpha)</strong></summary>

The connector exists but isn't wired into the demo. Internal-integration token from [notion.so/profile/integrations](https://notion.so/profile/integrations):

```bash
# .env
NOTION_API_KEY=secret_…  # or ntn_…

python -m indexer notion
```

</details>

---

## 🏗️ Architecture

```
  ┌───────────┐   ┌────────────┐   ┌───────────┐
  │ Slack API │   │ Linear API │   │ GitHub API│
  └─────┬─────┘   └─────┬──────┘   └─────┬─────┘
        │               │                 │
        └─────────┬─────┴────────┬────────┘
                  │              │
            ┌─────▼──────────────▼─────┐
            │   indexer/ (Python CLI)  │
            │  · fetch · parse · chunk │
            │  · embed (Voyage)        │
            └───────────┬──────────────┘
                        │
                ┌───────▼────────┐
                │  Postgres +    │
                │  pgvector      │
                │  (nodes,       │
                │   edges,       │
                │   chunks)      │
                └───────┬────────┘
                        │
        ┌───────────────▼───────────────┐
        │   mcp_server/ (FastMCP stdio) │
        │   17 tools                    │
        └───────────────┬───────────────┘
                        │
        ┌───────────────▼───────────────┐
        │  Your AI client of choice     │
        │  (Cline / Claude Code /       │
        │   Claude Desktop / …)         │
        └───────────────────────────────┘
```

The graph is hybrid: **nodes** for entities (slack_message, slack_channel, linear_issue, file, pr, commit, author, …), **edges** for relationships (`fixes`, `modifies`, `mentions`, `posted_in`, `replied_to`, `authored_by`, …), and **chunks** for the embedded text (HNSW index over `vector(512)`).

A single SQL query can mix kNN over chunks with graph traversal — that's the trick that lets `diagnose_incident` correlate a Slack panic message to a Linear RCA to a GitHub commit in one round trip.

---

## ⚙️ Configuration

All config lives in `.env` (template at `.env.example`). The minimum to run Hydrant against a GitHub repo:

| Variable | Required for | Where to get it |
|---|---|---|
| `DATABASE_URL` | Always | `docker compose up postgres` gives you `postgresql://ctx:ctx@localhost:5432/ctx` |
| `GITHUB_TOKEN` | GitHub indexer | [github.com/settings/tokens](https://github.com/settings/tokens) — `public_repo` is enough for public repos |
| `VOYAGE_API_KEY` | Embeddings | [voyageai.com](https://www.voyageai.com/) — free tier |
| `SLACK_BOT_TOKEN` | Slack indexer + write tools | Slack app → OAuth & Permissions |
| `LINEAR_API_KEY` | Linear indexer + write tools | [linear.app/settings/api](https://linear.app/settings/api) |
| `OPENROUTER_API_KEY` | Web demo only (optional) | [openrouter.ai](https://openrouter.ai) |
| `DEMO_INVITE_USERS` | `create_slack_channel` auto-invites | Comma-separated Slack member IDs (e.g. `U01ABC2DEF,U01XYZ4567`) |

---

## 🗺️ Repo layout

```
hydrant/
├── mcp_server/           # The 17 MCP tools (FastMCP / stdio)
├── indexer/              # Source connectors: github, slack, linear, notion
├── api/                  # FastAPI backend for the /demo page (optional)
├── frontend/             # Next.js — landing, /present deck, /demo chat+graph
├── scripts/              # Demo seeders (seed_slack_demo, seed_linear_demo)
├── db/schema.sql         # nodes / edges / chunks / repos
├── bin/run-mcp.sh        # Wrapper used by all MCP clients
├── docker-compose.yml    # Postgres + pgvector (+ optional frontend)
├── .mcp.json             # Auto-detected by Claude Code
├── .env.example          # All env vars documented
└── pyproject.toml        # Python deps (mcp, asyncpg, pgvector, httpx, fastapi, …)
```

---

## 💡 Example prompts

Paste any of these into an AI client connected to Hydrant.

> *"Auth is throwing 401s after a deploy — diagnose, open a Linear ticket, and post a summary to `#incident-…`. Link the ticket from the Slack post."*

> *"We're seeing checkout 500s on the canary cohort. What past incidents match? Who owns `src/checkout/`?"*

> *"Is there a runbook for postgres failover warmup? Cite the exact section."*

> *"PR #2156 looks suspicious — what does its diff actually do, and does the description match?"*

> *"Find every Slack thread in the last 30 days that mentions `JWT_ACCESS_EXPIRATION_MINUTES`."*

---

## 🗂️ Roadmap

- [ ] Sentry connector (currently the icon is on the landing page, not yet wired)
- [ ] Datadog / OpsGenie / PagerDuty connectors
- [ ] Confluence + Notion (Notion alpha exists in `indexer/notion_*.py`)
- [ ] Auto-suggested incident channel name based on past patterns
- [ ] Optional Anthropic-direct embeddings (avoid Voyage dependency)
- [ ] Helm chart for k8s deploys
- [ ] Web UI for browsing the knowledge graph (the `/demo` page is the seed)

Have an idea? [Open a discussion](https://github.com/the-public-works/hydrant/discussions).

---

## 🤝 Contributing

We'd love your help. See [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow.

Specific things we'd welcome PRs for:

- 🔌 **New source connectors** (Sentry, Datadog, Confluence, …) — the existing `indexer/*.py` files are short and templated
- 🐛 **Bug reports** with a reproduction
- 📖 **Docs improvements** — typos, clarifications, screenshots
- 🛠️ **New MCP tools** that compose existing ones

If you're not sure where to start, [open a discussion](https://github.com/the-public-works/hydrant/discussions) first.

---

## 📜 License

[MIT](LICENSE) — do whatever you want, just don't sue us.

---

## 🛠️ Built by

[**The Public Works**](https://github.com/the-public-works) — a small open-source studio building tools for engineers between hackathons.

🥇 Won the [Cline + 2Hero hackathon](https://thehydrant.dev) (Spotify *Intelligent Context Navigation for Developer Knowledge* challenge).

- **Chetan Singh** — [@chetan1029](https://github.com/chetan1029)
- **Henning Norén** — [@henning-noren](https://github.com/henning-noren)

If Hydrant helps your team — **drop a ⭐ on this repo**. That's how we know to keep shipping.
