# Demo guide — Team Spotify-2

> *Cutting incident MTTR with an AI knowledge layer.*
>
> Spotify × Cline + 2Hero hackathon · Chetan Singh + Henning

This guide is the single artefact to read before running the demo —
covers what we built, what jurors will see, and the exact prompts to
type during the live pitch.

For *setup* instructions (env vars, docker, indexing), see [README.md](./README.md).

---

## 1 · The pitch story (mapped to the jury's 4 questions)

| # | Jury question | Our answer |
| --- | --- | --- |
| **Q1** | What process are we helping users succeed with? | **The first 10–30 minutes of every incident** — when the on-call engineer is hunting through Slack, Linear, GitHub, and runbooks for context |
| **Q2** | How business critical is this process? | $5,600/min downtime cost (Gartner) · MTTR is on every CTO dashboard · top-3 driver of senior-engineer churn |
| **Q3** | How much impact could a great tech solution have? | One **AI knowledge layer** unifying Slack + Linear + GitHub. Generalizes to any tool tomorrow. Deployable to all 2,000+ Spotify services on day one |
| **Q4** | How much impact does our demo solution have? | **~25× faster context gathering** — 25 min hunt → < 60s synthesis posted back to the whole on-call team |

The fifth jury question — *"Would you want to meet this team for 20 minutes?"* — is answered directly by slide 8 of the deck.

---

## 2 · What we built — full inventory

### 2.1 · Pitch website (Next.js, in `frontend/`)

| Route | What it is |
| --- | --- |
| `/` | Marketing landing — one-page scroll for jurors / sharing |
| `/present` | 8-slide deck with keyboard nav + slide dots + exit button |
| `/present?speaker_notes=true` | Same deck, with speaker notes visible |
| `/demo` | The interactive ctx-mcp chat + graph (existing) |

Run with `pnpm dev` (port 3000) or `docker compose up frontend`.

### 2.2 · Data corpus — 176 embedded chunks across 3 real sources

| Source | Content | Chunks |
| --- | --- | --- |
| **Slack** (workspace `clinehackathon`) | 5 incident channels · 69 messages with threads · multi-author personas (Chetan/Henning) | 69 |
| **Linear** (org `cline-hackathon`, team `CLI`) | 4 cross-referenced past-incident tickets (CLI-5 → CLI-8) + comments | 13 |
| **GitHub** (`Henning-1/node-express-boilerplate`) | Real Express+JWT auth source · 3 runbooks · 2 ADRs · CHANGELOG · CODEOWNERS · staged bad PR + open incident issue | 94 |

Every probe query (auth · checkout · db · techdocs) returns hits from all 3 sources.

### 2.3 · MCP server — 16 tools (in `mcp_server/`)

```
Cross-source (5)        diagnose_incident · find_similar_incidents
                        get_runbook · search_all · who_owns

Slack write (1)         post_to_slack

Linear write (3)        create_linear_issue · add_linear_comment
                        update_linear_issue

GitHub-flavored (7)     search_context · get_node · get_neighbors
                        list_repos · trace_issue · git_blame · get_pr_diff
```

The headline call is `diagnose_incident` — one tool that fans out across
all three sources and returns synthesized context.

### 2.4 · Wired into 2 clients (sponsor-friendly)

| Client | Config location | Status |
| --- | --- | --- |
| **Claude Code** | `.mcp.json` at repo root (auto-detected) | ✅ Verified live |
| **Cline** | `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json` | ✅ Configured with autoApprove |
| **Claude Desktop** | `~/Library/Application Support/Claude/claude_desktop_config.json` | Same JSON shape; documented but not active |

### 2.5 · Reproducible demo seeders (in `scripts/`)

| Script | What it does |
| --- | --- |
| `seed_slack_demo.py` | Creates 5 incident channels · posts 90+ messages with personas + threads · auto-invites both teammates |
| `seed_linear_demo.py` | Creates 4 cross-referenced past-incident tickets matching the Slack content |

Both are **idempotent** — re-running won't duplicate channels, tickets, or messages.

---

## 3 · The live demo arc

```
       ┌────────────────────────────────────────────────────────┐
       │  Open /present — slides 1-4 land the problem + cost    │
       └────────────────────────────────────────────────────────┘
                                  │
                                  ▼
       ┌────────────────────────────────────────────────────────┐
       │  Slide 5 = SWITCH TO LIVE DEMO                         │
       │  Open Slack #incident-2026-05-auth-down — 4 panicked   │
       │  messages from Chetan + Henning, no fix yet            │
       └────────────────────────────────────────────────────────┘
                                  │
                                  ▼
       ┌────────────────────────────────────────────────────────┐
       │  Switch to Cline — type a single natural prompt:       │
       │    "Auth is throwing 401s after deploy. Diagnose,      │
       │     open a Linear ticket, post a summary to            │
       │     #incident-2026-05-auth-down."                      │
       └────────────────────────────────────────────────────────┘
                                  │
        (~3s) ───── diagnose_incident       (cross-source kNN)
        (~2s) ───── create_linear_issue     (CLI-N opens)
        (~2s) ───── post_to_slack           (synthesis lands in channel)
                                  │
                                  ▼
       ┌────────────────────────────────────────────────────────┐
       │  Show in Slack — bot's synthesized message with        │
       │   citations: Slack thread + Linear ticket + runbook.   │
       │  Show in Linear — fresh tracking ticket.               │
       │  Stopwatch on screen: < 60 seconds end-to-end.         │
       └────────────────────────────────────────────────────────┘
                                  │
                                  ▼
       ┌────────────────────────────────────────────────────────┐
       │  Back to deck — slides 6-8 (impact number, scale,      │
       │  20-min ask)                                           │
       └────────────────────────────────────────────────────────┘
```

---

## 4 · Cline test queries — graduated sequence

Run these in the Cline chat box to confirm everything's working **before**
the live pitch. Each one builds confidence step by step.

> Tip: in real use you don't need to name the tools — the model picks
> them from the docstrings. The first few are explicit for verification;
> the later ones use natural language.

### 4.1 · 🟢 "Is it alive?"  *(10 sec)*

```
What MCP tools do you have available from the ctx server?
```

**Expected:** Cline lists 16 tools — `diagnose_incident`, `find_similar_incidents`,
`get_runbook`, `who_owns`, `post_to_slack`, `create_linear_issue`,
`add_linear_comment`, `update_linear_issue`, plus the GitHub-flavored ones.

If it says "I don't see any ctx tools" → click the refresh icon in
Cline's MCP Servers panel.

### 4.2 · 🟢 Inventory check  *(15 sec)*

```
Call list_repos. What repositories are indexed?
```

**Expected:** `Henning-1/node-express-boilerplate` with node counts
(real source tree, doc_chunks for runbooks/ADRs, plus the staged bad PR
and open incident issue).

### 4.3 · 🟢 Slack-only retrieval  *(20 sec)*

```
Call find_similar_incidents with symptom "TechDocs build failing".
Show me the top 3 hits with their URLs.
```

**Expected:** All 3 hits are from `#incident-2024-11-techdocs-build`
and/or Linear `CLI-7`. Click any URL to verify it opens the right
Slack message.

### 4.4 · 🟢 GitHub runbook lookup  *(15 sec)*

```
Call get_runbook with topic "postgres failover warmup".
What does the runbook say to do?
```

**Expected:** Returns chunks from `docs/runbooks/database-failover.md`
with line ranges. Cline explains the `pg_prewarm` sequence in its own
words and cites the GitHub URL.

### 4.5 · 🟢 CODEOWNERS lookup  *(10 sec)*

```
Who owns src/services/token.service.js in the indexed repo?
```

**Expected:** Returns `@alice-platform`, with `matched_pattern`
`/src/services/token.service.js`. (Not `@Henning-1` — the auth-surface
rule is the more specific match.)

### 4.6 · 🟢 The headline cross-source call  *(30 sec)*

```
Call diagnose_incident for the symptom "auth is throwing 401s after a
deploy". Then summarize the result in 4 sentences max — one for the
past incident, one for the runbook, one for the owner, one for the
most likely fix.
```

**Expected:**
- Past incident: `#incident-2025-03-auth-down` or Linear `CLI-5`
- Runbook: `docs/runbooks/auth-runbook.md`
- Owner: `@alice-platform` (matches `src/config/config.js` and `src/middlewares/auth.js`)
- Fix: revert `JWT_ACCESS_EXPIRATION_MINUTES` default in `src/config/config.js`
  back to ≥ 1 (PR #2 set it to `0`)

This is the heart of the demo. **If this works, everything works.**

### 4.7 · 🟢 Demo finale: post back to Slack  *(45 sec)*

```
Diagnose the auth 401s incident, then post a Slack mrkdwn-formatted
summary back into channel `incident-2026-05-auth-down` as a NEW message
(not a thread reply). Use *bold*, _italic_, and <url|label> link
syntax. Cite the past Slack thread, the Linear RCA, and the runbook
section. Sign it as "🤖 ctx-mcp synthesis". Reply here with the
permalink.
```

**Expected:** Cline calls `diagnose_incident`, composes the summary,
calls `post_to_slack`, and returns the permalink. Open it in Slack —
should be a fresh formatted message in the incident channel.

### 4.8 · 🟢 Linear write tools  *(45 sec)*

```
Open a Linear tracking ticket for the auth 401s incident.
Title: "Auth 401s after deploy — incident-2026-05-auth-down".
Description should include the synthesis from diagnose_incident with
links back to the past Slack thread + the runbook.
Then add a comment: "rolled back to v2.3.4, no DB migrations".
Then mark it Done.
Reply with the ticket identifier and URL.
```

**Expected:** Cline calls `create_linear_issue` → `add_linear_comment`
→ `update_linear_issue("…", state="Done")`. Returns a Linear URL like
`https://linear.app/cline-hackathon/issue/CLI-N/…`. Open it to verify.

### 4.9 · 🟡 Variety check (different incident type)  *(45 sec)*

```
We're seeing checkout API 500s right after a canary deploy. What past
incidents match, what's the likely root cause, and who should I ping?
```

**Expected:**
- Past incident: `#incident-2025-09-checkout-500s` + Linear `CLI-8`
- Root cause: serializer regression in PR #2156 — high-value tier orders
  use a code path canary doesn't exercise
- Owner: `@chetan1029` / `@henning` (matches the wildcard rule for
  `packages/checkout/`)

Proves retrieval generalizes — not just memorized for the auth one.

### 4.10 · 🔴 The actual demo prompt (lock this exact wording)

```
Auth is throwing 401s on prod after a deploy. The active channel is
#incident-2026-05-auth-down.

Diagnose it, open a Linear tracking ticket, and post a Slack-formatted
summary into the channel. Link the Linear ticket from the Slack post.

Reply here with: the Linear ticket identifier, its URL, and the Slack
permalink.
```

This is what you'll paste live during the pitch. Run it 3-5 times in
rehearsal, time it with a stopwatch, and you'll know exactly how long
the on-stage portion takes.

---

## 5 · Demo-day checklist (print this)

### Staged GitHub artifacts — **do NOT delete or merge**

The live demo depends on two pieces of state in
`Henning-1/node-express-boilerplate` that need to stay exactly where
they are. If a future operator "tidies" the repo, the demo breaks.

| Artifact | Where | Why it has to stay |
| --- | --- | --- |
| Bad PR #2 — *chore: tighten JWT access token expiry* | https://github.com/Henning-1/node-express-boilerplate/pull/2 | The 30 → 0 default for `JWT_ACCESS_EXPIRATION_MINUTES` is what `trace_issue` / `get_pr_diff` traces back to from the live incident. PR is squash-merged into `main`; **do not revert.** |
| Issue #3 — *Auth 401s on prod after deploy — login completely broken* | https://github.com/Henning-1/node-express-boilerplate/issues/3 | The symptom report the agent reads when diagnosing. **Leave open.** Do not name the bad PR in the body. |
| Tag `demo-baseline` | `git tag -l demo-baseline` in the fork | Rollback anchor if the fork ever needs to be reset. Don't delete. |

### 30 minutes before

- [ ] `docker compose up -d postgres` — confirm `ctx-postgres` is **healthy**
- [ ] In another terminal: `cd frontend && pnpm dev` — `localhost:3000` loads
- [ ] Verify Cline shows `ctx` server with 16 tools (refresh icon if not)
- [ ] Open `#incident-2026-05-auth-down` in Slack — should be free of bot
      synthesis posts from rehearsal (scroll up + delete if any)
- [ ] Open Linear `cline-hackathon/team/CLI` — note the highest CLI-N number
      and **delete any `[SMOKE]`-prefixed tickets** from rehearsal
- [ ] Backup video file ready on desktop, full-screen-able with one click

### During

- [ ] Run `/present` on a fresh tab so the URL is clean for the screen-share
- [ ] Stopwatch ready (phone or in-page widget)
- [ ] Have the natural prompt copied to clipboard as fallback

### After

- [ ] Update slide 5 with a screenshot of the actual demo output
      for any post-event sharing

---

## 6 · The win condition

Jurors give us **10/10** on Q3 and Q4 if they:

1. **Feel** the on-call pain — slides 1–2 land it
2. **See the AI do real work** — one prompt → 3 tool calls → real Slack
   message → real Linear ticket — all in < 60 seconds, all with
   clickable citations
3. **Believe it scales to Spotify** — the "any tool, any team" framing
   on slide 7

Everything we built supports those three moments.
The remaining risk is execution, not capability.

---

## 7 · Quick reference

### Project structure

```
Cline-Hackathon/
├── .mcp.json                          ← Claude Code auto-config
├── bin/run-mcp.sh                     ← shared MCP launcher
├── frontend/                          ← Next.js (/, /present, /demo)
├── mcp_server/                        ← 16 MCP tools
├── indexer/                           ← github · slack · linear · notion
├── scripts/
│   ├── seed_slack_demo.py             ← creates incident channels + messages
│   └── seed_linear_demo.py            ← creates past-incident tickets
├── api/                               ← FastAPI for /demo (chat + graph)
├── db/schema.sql                      ← nodes / edges / chunks / repos
├── docker-compose.yml                 ← postgres + frontend
├── README.md                          ← setup
└── GUIDE.md                           ← (this file) demo runbook
```

Demo corpus repo (separate, public):

```
Henning-1/node-express-boilerplate/    ← real Express+JWT auth, runbooks, ADRs,
                                          + staged bad PR #2 and open issue #3
```

### One-line restart everything

```bash
docker compose up -d postgres                      # data layer
cd frontend && pnpm dev &                          # website on :3000
# Cline + Claude Code auto-pick up the MCP server  # tool layer
```

### Re-run any failing piece

| Failure | Fix |
| --- | --- |
| MCP tools missing in Cline | Click the refresh icon in MCP Servers panel |
| Postgres password rejected | Another local postgres on 5432 — `docker stop kdjango-postgres-1` then `docker compose up -d postgres` |
| Slack post fails | Bot not in channel — `python _invite_now.py` or `/invite @ctx-mcp` |
| Voyage rate-limited | Add a payment method on voyageai.com (no charge, lifts to 2k RPM) |
| Linear `400` on tool call | Hit our team-key/number filter; re-check the GraphQL query in `linear_fetcher.py` |

---

*Made with ☕ at 2am, like every good incident response.*
