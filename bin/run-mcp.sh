#!/usr/bin/env bash
# Wrapper that the MCP client (Claude Code / Cline / Claude Desktop)
# launches as a stdio server. We need three things:
#
#   1. The working directory must be the project root, so `python -m
#      mcp_server` resolves and so `.env` is found by python-dotenv.
#   2. Environment variables from .env must be loaded (DATABASE_URL,
#      VOYAGE_API_KEY, etc.) before the python process starts.
#   3. The interpreter must be the project's venv, not whatever python
#      happens to be on PATH for the MCP client.
#
# All three are mechanical; doing them in a wrapper keeps .mcp.json
# free of secrets and portable across machines.

set -euo pipefail

# Resolve the project root from the script's location, no matter
# where the wrapper is invoked from.
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${HERE}/.." && pwd)"
cd "${ROOT}"

# Load .env if it exists. `set -a` exports every var read after this.
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  . .env
  set +a
fi

VENV_PY="${ROOT}/.venv/bin/python"
if [[ ! -x "${VENV_PY}" ]]; then
  echo "error: ${VENV_PY} not found — run 'python -m venv .venv && pip install -e .' first" >&2
  exit 1
fi

# `exec` so the python process replaces this shell — keeps stdio plumbing
# clean for the MCP client and means the wrapper has no lingering PID.
exec "${VENV_PY}" -m mcp_server
