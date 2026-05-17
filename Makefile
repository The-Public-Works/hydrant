# Hydrant — convenience targets used by the README and landing page.
#
#   make setup           # one-shot: venv + deps + .env + Postgres + schema
#   make db-up           # start Postgres + pgvector in Docker
#   make db-migrate      # apply db/schema.sql
#   make index-github    # index a GitHub repo  (REPO=owner/name)
#   make index-slack     # index Slack channels (CHANNELS='incident-*')
#   make index-linear    # index Linear tickets (TEAMS=ENG)
#   make demo            # launch the MCP server (stdio)
#   make api             # launch the FastAPI shim used by the frontend
#   make frontend        # launch the Next.js demo UI
#   make lint            # ruff + mypy + pnpm lint
#   make test            # pytest
#   make clean           # nuke .venv and frontend build artifacts
#
# Variables (override on the command line):
#   PYTHON=python3.11 make setup
#   REPO=spotify/backstage make index-github

PYTHON     ?= python3
VENV       ?= .venv
VENV_BIN   := $(VENV)/bin
PIP        := $(VENV_BIN)/pip
PY         := $(VENV_BIN)/python
PNPM       ?= pnpm

# These overrides let the user run e.g. `make index-github REPO=foo/bar`.
REPO       ?=
CHANNELS   ?= incident-*
TEAMS      ?=

.PHONY: help
help:
	@awk 'BEGIN{FS=":.*##"; printf "\nHydrant — make targets\n\n"} \
	      /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2 }' \
	      $(MAKEFILE_LIST)

# ─── one-shot setup ────────────────────────────────────────────────────

.PHONY: setup
setup: $(VENV) .env db-up db-migrate ## Create venv, install deps, copy .env, start Postgres, apply schema
	@echo ""
	@echo "✓ Hydrant is set up."
	@echo "  Next: edit .env to add GITHUB_TOKEN + OPENAI_API_KEY,"
	@echo "        then 'make index-github REPO=owner/name'."

$(VENV):
	$(PYTHON) -m venv $(VENV)
	$(PIP) install --upgrade pip
	$(PIP) install -e .

.env:
	@if [ ! -f .env ]; then cp .env.example .env && echo "→ copied .env.example to .env (edit it before indexing)"; fi

# ─── database ──────────────────────────────────────────────────────────

.PHONY: db-up db-down db-migrate db-reset db-psql
db-up: ## Start Postgres + pgvector in Docker
	docker compose up -d postgres

db-down: ## Stop the Postgres container
	docker compose stop postgres

db-migrate: ## Apply db/schema.sql (substitutes EMBED_DIM into the vector column)
	@if [ -f .env ]; then set -a; . ./.env; set +a; fi; \
	  EMBED_DIM=$${EMBED_DIM:-1536}; \
	  echo "→ applying schema with vector($$EMBED_DIM)"; \
	  sed "s/__EMBED_DIM__/$$EMBED_DIM/g" db/schema.sql \
	    | docker compose exec -T postgres psql -U ctx -d ctx

db-reset: ## Drop and recreate the schema (needed when EMBED_DIM changes — wipes data)
	@echo "→ dropping all tables in the ctx database"
	@docker compose exec -T postgres psql -U ctx -d ctx -c \
	  "DROP TABLE IF EXISTS chunks, edges, nodes, repos CASCADE;"
	@$(MAKE) db-migrate

db-psql: ## Open a psql shell against the local Postgres
	docker compose exec postgres psql -U ctx -d ctx

# ─── indexers ──────────────────────────────────────────────────────────

.PHONY: index-github index-slack index-linear index-notion
index-github: ## Index a GitHub repo (REPO=owner/name)
	@if [ -z "$(REPO)" ]; then \
	  echo "usage: make index-github REPO=owner/name"; exit 1; \
	fi
	$(PY) -m indexer github $(REPO)

index-slack: ## Index Slack channels (CHANNELS='incident-*')
	$(PY) -m indexer slack --channels '$(CHANNELS)'

index-linear: ## Index Linear tickets (optionally TEAMS=ENG)
	@if [ -n "$(TEAMS)" ]; then \
	  $(PY) -m indexer linear --teams $(TEAMS); \
	else \
	  $(PY) -m indexer linear; \
	fi

index-notion: ## Index Notion pages
	$(PY) -m indexer notion

# ─── run ───────────────────────────────────────────────────────────────

.PHONY: demo api frontend
demo: ## Launch the MCP server (stdio — what your AI agent talks to)
	./bin/run-mcp.sh

api: ## Launch the FastAPI shim used by the Next.js demo
	$(PY) -m uvicorn api.main:app --reload --port 8000

frontend: ## Launch the Next.js demo UI on http://localhost:3000
	cd frontend && $(PNPM) install && $(PNPM) dev

# ─── quality ───────────────────────────────────────────────────────────

.PHONY: lint test
lint: ## Run ruff + mypy on Python and pnpm lint on the frontend
	-$(VENV_BIN)/ruff check .
	-$(VENV_BIN)/mypy mcp_server indexer api scripts
	-cd frontend && $(PNPM) lint

test: ## Run pytest
	$(VENV_BIN)/pytest -q

# ─── housekeeping ──────────────────────────────────────────────────────

.PHONY: clean
clean: ## Nuke .venv and frontend build artifacts
	rm -rf $(VENV) frontend/.next frontend/node_modules
