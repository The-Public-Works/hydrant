# Contributing to Hydrant

Thanks for thinking about contributing! Hydrant is small enough that one
afternoon's worth of work can meaningfully improve it — bug reports, new
indexers, new tools, docs fixes are all welcome.

## Ground rules

- **Be kind.** See [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).
- **Open an issue before a large PR.** A 5-line "is this direction OK?"
  comment saves both of us hours.
- **Keep PRs focused.** One change per PR — refactors, features, and
  formatting churn should land separately.

## Local dev setup

```bash
# Clone & install
git clone https://github.com/the-public-works/hydrant
cd hydrant
make setup           # creates .venv, installs deps, copies .env.example → .env

# Start Postgres + pgvector
docker compose up -d postgres

# Apply schema
make db-migrate

# Verify the MCP server boots
make demo            # expect "hydrant ready" on stderr
```

You'll need:

- **Python 3.11+** (the codebase uses modern typing)
- **Docker** (for Postgres + pgvector locally)
- **Node 20+ / pnpm** (only if you're touching `frontend/`)
- A **Voyage AI** key for embeddings — free tier works for small repos

## Project layout

```
mcp_server/   # FastMCP server — exposes 17 tools over stdio
indexer/      # Source connectors (github, slack, linear, notion)
db/           # SQL schema + migrations
api/          # FastAPI HTTP shim used by the frontend demo
frontend/     # Next.js demo UI (chat + graph)
scripts/      # One-off ops helpers
bin/          # Wrapper scripts MCP clients launch
```

If you're adding a new feature, the rough rule:
- New **source** (e.g. Jira, PagerDuty) → add an `indexer/<name>_fetcher.py`
- New **tool** → add a function to `mcp_server/tools.py` + register it in
  `mcp_server/__main__.py`
- New **frontend view** → add a route under `frontend/app/`

## Code style

- **Python:** type hints everywhere; we use `mypy` and `ruff`. Run
  `make lint` before pushing.
- **TypeScript:** strict mode is on. `cd frontend && pnpm lint` before pushing.
- **Commits:** conventional-ish — `feat:`, `fix:`, `docs:`, `chore:`.
  No hard rule but it helps the changelog.

## Tests

Honest disclosure: the test coverage is thin right now (this was a hackathon
project) — that's exactly the kind of contribution we'd love. If you're
adding new code, please include a test alongside it.

```bash
make test            # runs pytest
```

## Submitting a PR

1. Fork the repo and create a branch off `main`
2. Make your change, add a test if applicable
3. Run `make lint` and `make test`
4. Open a PR with a short description of *why* (the diff already shows *what*)
5. Link any related issue (`Closes #42`)

We'll usually respond within a couple of days. If we haven't, a polite ping
on the PR is welcome.

## Reporting bugs / asking questions

- **Bugs:** open a GitHub issue using the bug-report template
- **Feature requests:** open an issue using the feature-request template
- **Security issues:** see [SECURITY.md](./SECURITY.md) — please don't open a
  public issue for these
- **General questions:** GitHub Discussions

## License

By contributing, you agree your contributions will be licensed under the
project's [MIT license](./LICENSE).
