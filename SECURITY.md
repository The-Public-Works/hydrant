# Security policy

## Reporting a vulnerability

Hydrant indexes sensitive workspace data — Slack threads, Linear tickets,
private GitHub repos — so we take security reports seriously.

**Please do not open a public GitHub issue for security vulnerabilities.**

Instead, email: **chetanbadgujar92@gmail.com**

Include:

- A description of the vulnerability
- Steps to reproduce (or a proof of concept)
- The affected version / commit hash
- Your assessment of the impact

We'll acknowledge your report within **3 business days** and aim to provide a
fix or mitigation within **30 days** for high-severity issues.

## Supported versions

Hydrant is pre-1.0. We only patch the `main` branch — please run against
the latest commit when reporting.

## Scope

In scope:

- The MCP server (`mcp_server/`)
- The indexers (`indexer/`)
- The API shim (`api/`)
- The frontend demo (`frontend/`)
- Database schema and migrations (`db/`)

Out of scope:

- Vulnerabilities in upstream dependencies (please report those directly to
  the dependency)
- Issues that require a compromised host or stolen API tokens to exploit
- Social engineering, physical attacks, or DoS against the demo deployment

## Operational security guidance

If you're self-hosting Hydrant, please:

- **Never commit `.env`.** It's in `.gitignore` for a reason — it holds your
  Slack bot token, Linear API key, GitHub token, and OpenAI key.
- **Scope tokens narrowly.** GitHub token: `public_repo` is enough for most
  use cases. Slack bot: only the scopes listed in the README.
- **Run Postgres on a private network.** The default Docker Compose binds to
  localhost — keep it that way in production.
- **Treat indexed data as sensitive.** Anyone with read access to your
  Postgres can read your indexed Slack/Linear/GitHub content.

Thanks for helping keep Hydrant and its users safe.
