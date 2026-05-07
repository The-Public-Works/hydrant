"""One-shot Linear workspace seeder for the demo.

Creates a small set of past incident tickets that line up with the
content seeded in Slack — so when the live demo asks "what do we know
about this auth incident?", the MCP can cite both the Slack thread
*and* the matching Linear ticket.

    python -m scripts.seed_linear_demo                    # default team, all tickets
    python -m scripts.seed_linear_demo --team ENG         # pick a specific team key
    python -m scripts.seed_linear_demo --dry-run          # print what we'd do

Idempotent: if a ticket with the same title already exists in the team,
we skip creation (and don't re-post comments).

Required: LINEAR_API_KEY in .env (lin_api_…).
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import sys
from dataclasses import dataclass, field

from indexer.config import Config
from indexer.linear_fetcher import Linear, LinearError

log = logging.getLogger(__name__)


# --- scenario shape -------------------------------------------------------


@dataclass
class TicketComment:
    body: str


@dataclass
class Ticket:
    """One past-incident ticket. Lifecycle: created in `state_name` (we'll
    pick the right state ID from the team's workflow at seed time) with
    `priority` (0=none, 1=urgent, 2=high, 3=normal, 4=low) and `labels`
    populated by the team's existing label set when names match.
    """

    title: str
    description: str
    state_name: str = "Done"  # most past incidents land in Done/Completed
    priority: int = 2
    labels: list[str] = field(default_factory=list)
    comments: list[TicketComment] = field(default_factory=list)


# Tickets correspond 1:1 to references in the seeded Slack messages.
# Keep titles + descriptions semantically rich so retrieval against e.g.
# "auth 401s" pulls the right one back even when the user doesn't know
# the ticket identifier.
TICKETS: list[Ticket] = [
    Ticket(
        title="RCA: auth provider 401s after v1.21 upgrade — schema change in app-config",
        description=(
            "## Summary\n\n"
            "v1.21 changed the GitHub OAuth provider config schema "
            "(`auth.providers.github.production`) to nest credentials under "
            "`clientCredentials`. Our deployed app-config.production.yaml still "
            "passed `clientId`/`clientSecret` at the top level, so provider "
            "registration silently no-op'd on boot. Every login request 401'd "
            "with `unknown_oauth_provider: github`.\n\n"
            "## Impact\n\n"
            "- Login fully broken on web, mobile, CLI for ~13 minutes\n"
            "- ~11k Sentry events at peak\n"
            "- 100% of new sessions affected\n\n"
            "## Fix\n\n"
            "PR #1241 — 3-line app-config update to nest credentials correctly. "
            "See also ADR-042 in the platform repo for the schema-change rationale.\n\n"
            "## Action items\n\n"
            "- [ ] Add integration test for OAuth provider config bootstrapping\n"
            "- [ ] Add `auth-config/` to CODEOWNERS\n"
            "- [ ] Cross-reference deployed configs against ADR schema migrations in CI"
        ),
        priority=2,
        labels=["incident", "auth"],
        comments=[
            TicketComment(
                "Slack thread: see #incident-2025-03-auth-down for the live "
                "investigation timeline."
            ),
            TicketComment(
                "Owner @alice was not paged because auth-config/ isn't in "
                "CODEOWNERS. Added in follow-up PR #1247."
            ),
        ],
    ),
    Ticket(
        title="Post-failover warmup runbook — pg_prewarm step missing",
        description=(
            "## Summary\n\n"
            "Postgres HA failover promoted a cold replica; buffer pool was "
            "empty, so every query hit disk. Catalog query p99 spiked from "
            "<200ms to 12s for ~20 minutes.\n\n"
            "## Resolution\n\n"
            "Manually ran `SELECT pg_prewarm('catalog_entities_idx')` on the "
            "top 5 hot indexes. p99 recovered to baseline within 6 minutes "
            "of prewarm.\n\n"
            "## Required change\n\n"
            "Update database-failover runbook (in the platform-runbooks "
            "GitHub repo) to include a post-failover `pg_prewarm` step. "
            "Long-term: automate this as part of failover orchestration.\n\n"
            "## Linked Slack: #incident-2025-04-db-slow"
        ),
        priority=3,
        labels=["incident", "database", "runbook"],
        comments=[
            TicketComment(
                "Postgres docs explicitly call out cold-buffer-pool risk on "
                "failover — our runbook had nothing about it."
            ),
        ],
    ),
    Ticket(
        title="Pin mkdocs in TechDocs base image instead of pip-install per-build",
        description=(
            "## Summary\n\n"
            "py3.12 base image bump (PR #882) put mkdocs at `/usr/local/lib/"
            "python3.12/site-packages/bin/mkdocs` instead of `/usr/local/bin/"
            "mkdocs`. Every TechDocs build broke with `mkdocs: command not "
            "found` for ~30 minutes.\n\n"
            "## Resolution\n\n"
            "PR #883 — explicit `pip install --target` + PATH update in the "
            "Dockerfile.\n\n"
            "## Long-term fix (this ticket)\n\n"
            "Pin mkdocs in our base image rather than lazy-installing it on "
            "each build. Reduces blast radius of upstream Python version bumps."
        ),
        priority=4,
        labels=["techdocs", "ci"],
        comments=[
            TicketComment(
                "Adding `platform-base-image/` to CODEOWNERS so reviews loop "
                "in the TechDocs team for downstream impact."
            ),
        ],
    ),
    Ticket(
        title="Canary coverage gap — high-value-traffic code paths not exercised",
        description=(
            "## Summary\n\n"
            "Canary deploys route 5% of traffic to the new version, but our "
            "high-value (>$1000) order code path uses a separate routing tier "
            "that canary doesn't touch. A serializer regression in PR #2156 "
            "shipped through canary green and only blew up at GA — "
            "see #incident-2025-09-checkout-500s.\n\n"
            "## Proposal\n\n"
            "1. Mirror 1% of the high-value tier into canary (separate flag)\n"
            "2. Add a smoke test that synthesizes a $5000 order against the "
            "   canary cohort during the 30-min bake window\n"
            "3. Add a 'high-value path coverage' check to the deploy gate"
        ),
        priority=2,
        labels=["incident", "canary", "deploy"],
        comments=[
            TicketComment(
                "Original RCA proposed (1) + (2). (3) added after the post-"
                "mortem brought up two earlier near-misses with the same "
                "root cause."
            ),
        ],
    ),
]


# --- runner ---------------------------------------------------------------


# Linear's GraphQL mutations — kept inline so we don't spread them across
# multiple files just for the seeder. Variables passed as a dict.

CREATE_ISSUE = """
mutation CreateIssue($input: IssueCreateInput!) {
  issueCreate(input: $input) {
    success
    issue { id identifier title url }
  }
}
"""

CREATE_COMMENT = """
mutation CreateComment($input: CommentCreateInput!) {
  commentCreate(input: $input) {
    success
    comment { id }
  }
}
"""

# Existing-issue lookup so we can be idempotent on title.
FIND_BY_TITLE = """
query FindIssue($team: ID!, $title: String!) {
  issues(filter: { team: { id: { eq: $team } }, title: { eq: $title } }) {
    nodes { id identifier title url }
  }
}
"""

# State workflow for a team — we pick the state matching `state_name` if
# the team has one (e.g. "Done", "Completed", "Cancelled").
TEAM_STATES = """
query TeamStates($team: ID!) {
  workflowStates(filter: { team: { id: { eq: $team } } }) {
    nodes { id name type }
  }
}
"""

# Labels for a team — we attach the ones whose names match (case-insensitive).
TEAM_LABELS = """
query TeamLabels($team: ID!) {
  issueLabels(filter: { team: { id: { eq: $team } } }) {
    nodes { id name }
  }
}
"""


async def _resolve_team(ln: Linear, *, team_key: str | None) -> dict | None:
    """Find the requested team (by key) or return the first team Linear
    hands back.
    """
    selected: dict | None = None
    async for team in ln.teams():
        if team_key:
            if team.get("key") == team_key:
                return team
        elif selected is None:
            selected = team
    return selected if not team_key else None


async def _state_id_for(ln: Linear, *, team_id: str, state_name: str) -> str | None:
    data = await ln._query(TEAM_STATES, {"team": team_id})
    for st in (data.get("workflowStates") or {}).get("nodes", []):
        if (st.get("name") or "").lower() == state_name.lower():
            return st["id"]
    # Fall back to any "completed" state if the requested name isn't found
    for st in (data.get("workflowStates") or {}).get("nodes", []):
        if st.get("type") == "completed":
            return st["id"]
    return None


async def _label_ids_for(
    ln: Linear, *, team_id: str, names: list[str],
) -> list[str]:
    if not names:
        return []
    data = await ln._query(TEAM_LABELS, {"team": team_id})
    by_name = {
        (lb.get("name") or "").lower(): lb["id"]
        for lb in (data.get("issueLabels") or {}).get("nodes", [])
    }
    out: list[str] = []
    for n in names:
        lid = by_name.get(n.lower())
        if lid:
            out.append(lid)
    return out


async def _existing_issue(
    ln: Linear, *, team_id: str, title: str,
) -> dict | None:
    data = await ln._query(FIND_BY_TITLE, {"team": team_id, "title": title})
    nodes = (data.get("issues") or {}).get("nodes", [])
    return nodes[0] if nodes else None


async def _seed_ticket(
    ln: Linear, *, team: dict, ticket: Ticket, dry_run: bool,
) -> tuple[str | None, int]:
    """Create the ticket + comments. Returns (identifier, comment_count)."""
    team_id = team["id"]
    if dry_run:
        log.info(
            "DRY RUN: would create [%s] %r (priority=%d, labels=%s, comments=%d)",
            team.get("key"), ticket.title, ticket.priority,
            ticket.labels, len(ticket.comments),
        )
        return ("(dry-run)", 0)

    # Idempotency: skip if title already exists.
    existing = await _existing_issue(ln, team_id=team_id, title=ticket.title)
    if existing:
        log.info("already exists: %s — %s", existing["identifier"], ticket.title)
        return (existing["identifier"], 0)

    state_id = await _state_id_for(
        ln, team_id=team_id, state_name=ticket.state_name,
    )
    label_ids = await _label_ids_for(
        ln, team_id=team_id, names=ticket.labels,
    )

    issue_input: dict = {
        "teamId": team_id,
        "title": ticket.title,
        "description": ticket.description,
        "priority": ticket.priority,
    }
    if state_id:
        issue_input["stateId"] = state_id
    if label_ids:
        issue_input["labelIds"] = label_ids

    data = await ln._query(CREATE_ISSUE, {"input": issue_input})
    res = data.get("issueCreate") or {}
    if not res.get("success"):
        log.error("issueCreate failed for %r: %s", ticket.title, data)
        return (None, 0)
    issue = res["issue"]
    log.info("created %s — %s", issue["identifier"], ticket.title)

    # Comments
    for cm in ticket.comments:
        await ln._query(
            CREATE_COMMENT,
            {"input": {"issueId": issue["id"], "body": cm.body}},
        )
        await asyncio.sleep(0.2)  # gentle on the API

    return (issue["identifier"], len(ticket.comments))


async def _run(args: argparse.Namespace) -> None:
    cfg = Config.load()
    if not cfg.linear_api_key:
        raise SystemExit(
            "LINEAR_API_KEY is not set in .env — see .env.example."
        )

    async with Linear(cfg.linear_api_key) as ln:
        ws = await ln.workspace_ref()
        log.info("seeding linear org %s", ws.org_url_key)

        team = await _resolve_team(ln, team_key=args.team)
        if team is None:
            available: list[str] = []
            async for t in ln.teams():
                available.append(t.get("key", "?"))
            raise SystemExit(
                f"Could not find team {args.team!r}. "
                f"Available team keys: {', '.join(available) or '(none)'}"
            )
        log.info("using team [%s] %s (id=%s)", team["key"], team["name"], team["id"])

        created: list[str] = []
        total_comments = 0
        for ticket in TICKETS:
            ident, n_comments = await _seed_ticket(
                ln, team=team, ticket=ticket, dry_run=args.dry_run,
            )
            if ident:
                created.append(ident)
                total_comments += n_comments

        log.info(
            "done. tickets touched: %s, comments posted: %d",
            ", ".join(created), total_comments,
        )

        if not args.dry_run and created:
            print(f"\n→ open in Linear:")
            for ident in created:
                # Linear URLs use the org urlKey + identifier
                print(f"  https://linear.app/{ws.org_url_key}/issue/{ident}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="seed_linear_demo", description=__doc__,
    )
    parser.add_argument(
        "--team", metavar="KEY",
        help=(
            "Linear team key (e.g. ENG). Defaults to the first team Linear "
            "returns from teams()."
        ),
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Print what would happen without creating anything.",
    )
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s - %(message)s",
    )
    asyncio.run(_run(args))
    return 0


if __name__ == "__main__":
    sys.exit(main())
