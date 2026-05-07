"""One-shot Slack workspace seeder for the demo.

Creates a small set of realistic incident channels and pre-populates them
with on-call chatter. Idempotent: re-running won't duplicate channels or
re-post messages.

    python -m scripts.seed_slack_demo                # create+seed past + fresh
    python -m scripts.seed_slack_demo --past         # only the resolved ones
    python -m scripts.seed_slack_demo --fresh        # only the live-demo channel
    python -m scripts.seed_slack_demo --dry-run      # print what we'd do

Required scopes on the bot:
    channels:manage   create channels
    chat:write        post messages
    channels:read     list channels (already required for indexing)
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import os
import sys
from dataclasses import dataclass, field

from indexer.config import Config
from indexer.slack_fetcher import Slack, SlackError

log = logging.getLogger(__name__)


# --- scenario data --------------------------------------------------------
# Each scenario lays out a coherent incident timeline. Messages are
# delivered in order; messages with `reply_to=N` are posted as a thread
# reply to the earlier message at index N (0-based) in the same scenario.


@dataclass
class Msg:
    text: str
    reply_to: int | None = None  # index of the parent message in this scenario
    # When set, the bot will post this message with a custom username + icon
    # so the conversation looks like it's between real teammates rather than
    # one bot talking to itself. Requires `chat:write.customize` on the bot.
    speaker: str | None = None


@dataclass
class Scenario:
    channel: str
    topic: str
    messages: list[Msg] = field(default_factory=list)


# Personas the bot impersonates per-message in the human-flavored scenario.
# Slack still shows an "APP" badge next to each message (the bot is the
# actual sender), but the username + icon make the conversation read as
# two distinct teammates at a glance.
PERSONAS: dict[str, dict[str, str]] = {
    "chetan":  {"username": "Chetan Singh", "icon_emoji": ":technologist:"},
    "henning": {"username": "Henning",      "icon_emoji": ":bear:"},
}


PAST_INCIDENTS: list[Scenario] = [
    # ── Scenario 1 ────────────────────────────────────────────────────
    # The headline past incident. Designed to be the obvious semantic
    # match for the fresh "auth 401s" channel below — the live demo
    # depends on this being retrievable.
    Scenario(
        channel="incident-2025-03-auth-down",
        topic="RESOLVED · Auth provider broken after v1.21 upgrade · sev2",
        messages=[
            Msg("🚨 [10:42] sev2 — wall of 401s on prod auth. datadog auth-prod "
                "dashboard is fully red. https://app.datadoghq.com/dashboard/auth-prod"),
            Msg("[10:43] @here on it, rolling page out"),
            Msg("[10:44] when did this start? error rate spike at 10:38 in grafana"),
            Msg("[10:44] right after the v1.21 deploy finished. login fully broken "
                "on web, mobile, and the CLI"),
            Msg("[10:45] sentry events: `unknown_oauth_provider: github` — "
                "11k events in last 5 min. https://sentry.io/issue/PROD-9821 (fake)"),
            Msg("[10:46] starting rollback to v1.20.4 via spinnaker. ETA 4 min"),
            # Thread on the rollback message (index 5)
            Msg("[10:47] did v1.21 ship any DB migrations? need to know if rollback is safe",
                reply_to=5),
            Msg("[10:47] no. checked the migrations dir — last one was 2 weeks ago. "
                "rollback is clean", reply_to=5),
            Msg("[10:48] confirmed — no schema drift, rollback proceeding", reply_to=5),
            # Back to main thread
            Msg("[10:50] FOUND IT — `auth.providers.github.production` config schema "
                "changed in v1.21 (PR #1234). we're still passing `clientId` at the "
                "top level instead of nested under `clientCredentials`. so the "
                "provider registration silently no-ops on boot, then every login "
                "request 401s with `unknown_oauth_provider`"),
            Msg("[10:51] fix is a 3-line app-config.production.yaml change. PR #1241 "
                "out for review"),
            Msg("[10:53] PR #1241 merged + deployed. error rate dropping"),
            Msg("[10:55] ✅ all clear. 401 rate back to baseline (~3/min vs. 11k/min "
                "at peak). full RCA in linear ENG-2104 by EOD tomorrow"),
            Msg("[10:56] post-mortem questions for the RCA: (1) why did v1.21 ship "
                "without an integration test for github oauth? (2) why isn't "
                "auth-config in CODEOWNERS — @alice owns that area but wasn't paged"),
            Msg("[11:02] the deeper miss: the v1.21 ADR called out the schema "
                "change but we didn't cross-reference our deployed configs. "
                "see ADR-042 in notion"),
            # A separate thread on the FOUND IT message (now index 9)
            Msg("[10:51] do we have a regression test for this? feels like exactly "
                "the kind of break a smoke test should catch", reply_to=9),
            Msg("[10:52] no integration coverage for oauth provider config currently. "
                "putting it in the RCA action items", reply_to=9),
        ],
    ),

    # ── Scenario 2 ────────────────────────────────────────────────────
    # Different incident, different signal — proves the MCP retrieves
    # from the right channel for the right query.
    Scenario(
        channel="incident-2025-04-db-slow",
        topic="RESOLVED · Catalog DB query latency p99 12s after HA failover",
        messages=[
            Msg("⚠️ [14:25] p99 catalog query latency at 12s, normally <200ms. "
                "user-facing pages timing out"),
            Msg("[14:26] started at 14:22 — that's exactly when the postgres-prod "
                "HA failover happened (planned maintenance window)"),
            Msg("[14:27] @marcus paging you, this looks db-related"),
            Msg("[14:28] in. running pg_stat_statements on the new primary now"),
            Msg("[14:30] confirmed — buffer pool is cold. the failover promoted the "
                "replica but the new primary's shared_buffers haven't seen the hot "
                "indexes yet, so every query is hitting disk"),
            Msg("[14:31] options: (a) wait for organic warmup ~30 min, (b) force "
                "warmup with pg_prewarm. going with (b)"),
            Msg("[14:33] running `SELECT pg_prewarm('catalog_entities_idx');` for "
                "the top 5 hot indexes"),
            Msg("[14:36] p99 back to 410ms. still elevated but no longer timing out"),
            Msg("[14:42] ✅ p99 at 180ms, fully recovered. closing the incident"),
            Msg("[14:50] RCA action: our HA runbook doesn't include a post-failover "
                "warmup step. opening linear ENG-1432 to add it + automate"),
            Msg("[15:10] 📒 updated the database-failover runbook in notion to "
                "include `pg_prewarm` step. see https://notion.so/db-failover-runbook (fake)"),
            # Thread on the buffer-pool finding (index 4)
            Msg("[14:31] is this a known thing? do other teams hit it on failover?",
                reply_to=4),
            Msg("[14:32] yes — postgres docs explicitly call this out. our runbook "
                "should have caught it but doesn't mention prewarm anywhere", reply_to=4),
        ],
    ),

    # ── Scenario 3 ────────────────────────────────────────────────────
    # Build/CI flavor — adds variety to retrieval.
    Scenario(
        channel="incident-2024-11-techdocs-build",
        topic="RESOLVED · TechDocs builds failing — mkdocs not on PATH",
        messages=[
            Msg("[09:15] anyone else hitting failed TechDocs deploys? mine's been "
                "failing for ~30 min"),
            Msg("[09:16] same here. backstage scaffolder workflow exits with "
                "`/bin/sh: mkdocs: command not found`"),
            Msg("[09:18] base image was bumped from python:3.11-slim to "
                "python:3.12-slim in PR #882 yesterday"),
            Msg("[09:19] mkdocs install runs cleanly (`Successfully installed "
                "mkdocs-1.5.3`) but the binary lands in `/usr/local/lib/python3.12/"
                "site-packages/bin` instead of `/usr/local/bin` like 3.11 did"),
            Msg("[09:22] fix: explicit `pip install --target` + PATH update in the "
                "Dockerfile. PR #883 out"),
            Msg("[09:30] PR #883 merged. test build green. closing"),
            Msg("[09:32] long-term fix: pin mkdocs in our base image instead of "
                "lazy-installing per-build. linear ENG-1198"),
            # Thread on PR #882 reference (index 2)
            Msg("[09:18] who reviewed/approved #882? feels like the kind of change "
                "that should've blocked on green TechDocs builds", reply_to=2),
            Msg("[09:19] me 🙋 — sorry, didn't realize TechDocs was downstream of "
                "the base image. adding it to the platform CODEOWNERS now", reply_to=2),
        ],
    ),
]


# ── Human-flavored scenario ──────────────────────────────────────────
# A single past incident where messages alternate between Chetan and Henning,
# posted with custom usernames + icons so it reads like real on-call chatter.
# Different topic from the auto-seeded ones (checkout 500s instead of auth)
# so retrieval has clear semantic separation.
HUMAN_INCIDENT = Scenario(
    channel="incident-2025-09-checkout-500s",
    topic="RESOLVED · Checkout API 500s after canary deploy · sev2",
    messages=[
        Msg(speaker="chetan",  text="🚨 just got paged — checkout API 500 rate is climbing fast. anyone else seeing it?"),
        Msg(speaker="henning", text="yeah pingdom went red 30s ago. dashboard: https://app.datadoghq.com/dashboard/checkout-prod (fake)"),
        Msg(speaker="chetan",  text="started ~14:02, that lines up with the canary cohort going to 25%"),
        Msg(speaker="henning", text="sentry says `InvalidArgumentError: timestamp out of range` — 8k events"),
        Msg(speaker="chetan",  text="link?"),
        Msg(speaker="henning", text="https://sentry.io/issues/CHECKOUT-9821 (fake). field is `order_received_at`, all values look like year 53000+ 😬"),
        Msg(speaker="chetan",  text="lol someone multiplied epoch * 1000 somewhere"),
        Msg(speaker="henning", text="checking the diff — PR #2156 changed the order serializer, added a 'milliseconds support' branch but only for the new field"),
        Msg(speaker="chetan",  text="yep that's it. they multiplied `time.time()` by 1000 but left it as a unix timestamp downstream → postgres rejects it"),
        # Thread on Henning's PR-link message (index 7)
        Msg(speaker="chetan",  text="quick Q — why did canary not catch this? PR did go through canary first", reply_to=7),
        Msg(speaker="henning", text="canary only gets ~5% of traffic, and looking at sentry the failures are all on orders >$1000 which routes through the high-value code path. canary doesn't get high-value traffic", reply_to=7),
        Msg(speaker="chetan",  text="ah of course. that's a known canary gap, ENG-988 in linear", reply_to=7),
        # Back to main thread
        Msg(speaker="henning", text="ok so revert PR #2156?"),
        Msg(speaker="chetan",  text="faster: hotfix the field. rest of the PR is fine and reverting drags in 4 other commits"),
        Msg(speaker="henning", text="ack, I'll write the customer comm + status page"),
        Msg(speaker="chetan",  text="hotfix PR up: #2161, single-line — `int(time.time())` instead of `int(time.time() * 1000)`"),
        Msg(speaker="henning", text="status page updated, customers notified, RCA template started"),
        Msg(speaker="chetan",  text="PR merged + deployed via emergency pipeline. error rate dropping"),
        Msg(speaker="henning", text="confirmed, 500 rate back to baseline ~0.02%. closing the page"),
        Msg(speaker="chetan",  text="✅ all clear. who owns the order serializer? I always forget"),
        Msg(speaker="henning", text="@marcus's team. CODEOWNERS at api/orders/ → @marcus. looping him into the RCA channel"),
        Msg(speaker="chetan",  text="📝 will write up the timeline in notion later tonight. RCA candidate: timestamp validator should reject anything > now+1 year"),
        Msg(speaker="henning", text="+1, also we should fill in the canary-coverage gap. tracking that in linear ENG-988 follow-up"),
        Msg(speaker="chetan",  text="thanks for the assist 🤝"),
        Msg(speaker="henning", text="anytime, that was a clean one"),
    ],
)


# ── Fresh / live-demo channel ─────────────────────────────────────────
# Only the panic intro — deliberately unresolved. The whole point of the
# live demo is the MCP fans out, finds the resolved 2025-03 incident,
# and posts the synthesized context HERE.
FRESH_INCIDENT = Scenario(
    channel="incident-2026-05-auth-down",
    topic="🔴 ACTIVE · Auth throwing 401s — no fix yet, paging now",
    messages=[
        Msg("🚨 sev2 — auth is throwing 401s on prod again. error rate climbing fast"),
        Msg("just deployed v2.4.0 ten minutes ago, this might be related"),
        Msg("anyone remember the auth-down incident from last year? "
            "had a similar shape but I can't find the channel anymore 😬"),
        Msg("paging @here — need eyes on this"),
    ],
)


# --- runner ---------------------------------------------------------------


async def _resolve_invite_user_ids(
    sl: Slack, *, raw: str | None,
) -> list[str]:
    """Resolve a comma-separated --invite arg (user_ids and/or emails)
    into a list of Slack user_ids. Each entry that fails to resolve gets
    logged but doesn't fail the whole run — partial invites are still useful.
    """
    if not raw:
        return []
    out: list[str] = []
    for entry in (e.strip() for e in raw.split(",") if e.strip()):
        if entry.startswith(("U", "W")) and entry.isalnum():
            out.append(entry)
            continue
        if "@" in entry:
            user = await sl.lookup_user_by_email(entry)
            if user and user.get("id"):
                out.append(user["id"])
                continue
            log.warning(
                "could not resolve email %r — needs `users:read.email` scope. "
                "Skipping; pass that user's member ID instead.", entry,
            )
            continue
        log.warning("unrecognized --invite entry %r — skipping", entry)
    return out


async def _seed_scenario(
    sl: Slack, scenario: Scenario, *, dry_run: bool, invite_user_ids: list[str],
) -> tuple[str, int]:
    """Create channel (idempotent) + post messages (also idempotent — we
    skip posting if the channel already has any messages from us).

    Returns (channel_id, messages_posted).
    """
    if dry_run:
        log.info(
            "DRY RUN: would create #%s, set topic, post %d messages",
            scenario.channel, len(scenario.messages),
        )
        return ("(dry-run)", 0)

    channel = await sl.create_channel(scenario.channel)
    channel_id = channel["id"]
    log.info("channel #%s -> %s", scenario.channel, channel_id)

    # Topic
    try:
        await sl.set_channel_topic(channel_id, scenario.topic)
    except SlackError as e:
        log.warning("set_topic failed for #%s: %s", scenario.channel, e.code)

    # Invite the humans running this — Slack public channels don't add the
    # bot's creator automatically, so without this they have to manually
    # join each one to see the seeded conversation.
    if invite_user_ids:
        try:
            await sl.invite_to_channel(channel_id, invite_user_ids)
            log.debug(
                "invited %s to #%s",
                ", ".join(invite_user_ids), scenario.channel,
            )
        except SlackError as e:
            log.warning(
                "invite failed for #%s: %s — they'll need to join via Browse Channels",
                scenario.channel, e.code,
            )

    # Idempotency check: if there are already messages from us, skip.
    # Easy heuristic — pull up to 5 messages, if any have user==bot_self
    # or text matches our first scenario message, treat the channel as
    # already-seeded.
    existing: list[dict] = []
    try:
        async for m in sl.history(channel_id):
            existing.append(m)
            if len(existing) >= 5:
                break
    except SlackError as e:
        # If we just created the channel we're auto-joined, but in case
        # of a pre-existing channel without membership, surface clearly.
        log.warning(
            "history of #%s failed (%s) — invite the bot to the channel "
            "if you want it re-seeded",
            scenario.channel, e.code,
        )
        return (channel_id, 0)

    if existing:
        first_text = scenario.messages[0].text
        if any((m.get("text") or "").startswith(first_text[:40]) for m in existing):
            log.info(
                "#%s already seeded (first message present), skipping",
                scenario.channel,
            )
            return (channel_id, 0)

    # Post messages, recording each ts so thread replies can reference parents
    posted_ts: list[str] = []
    posted_count = 0
    for msg in scenario.messages:
        thread_ts: str | None = None
        if msg.reply_to is not None and 0 <= msg.reply_to < len(posted_ts):
            thread_ts = posted_ts[msg.reply_to]

        # If the message specifies a speaker persona, override the bot's
        # username + icon so the conversation reads as multi-author. Falls
        # back to the bot's defaults when no persona is set.
        kwargs: dict = {"thread_ts": thread_ts}
        if msg.speaker:
            persona = PERSONAS.get(msg.speaker)
            if persona:
                kwargs["username"] = persona["username"]
                kwargs["icon_emoji"] = persona["icon_emoji"]
            else:
                log.warning(
                    "unknown speaker %r in #%s — posting as the bot",
                    msg.speaker, scenario.channel,
                )

        resp = await sl.post_message(channel_id, msg.text, **kwargs)
        ts = resp.get("ts") or ""
        posted_ts.append(ts)
        posted_count += 1
        # Tiny delay so messages have distinguishable timestamps and Slack
        # doesn't rate-limit. Tier-3 endpoint allows 50+/minute easily.
        await asyncio.sleep(0.3)

    log.info("posted %d messages to #%s", posted_count, scenario.channel)
    return (channel_id, posted_count)


async def _run(args: argparse.Namespace) -> None:
    cfg = Config.load()
    if not cfg.slack_bot_token:
        raise SystemExit(
            "SLACK_BOT_TOKEN is not set in .env — see .env.example."
        )

    # If no flag is given, seed everything. Otherwise, seed only the
    # subsets requested.
    any_flag = args.past or args.fresh or args.human
    scenarios: list[Scenario] = []
    if args.past or not any_flag:
        scenarios.extend(PAST_INCIDENTS)
    if args.human or not any_flag:
        scenarios.append(HUMAN_INCIDENT)
    if args.fresh or not any_flag:
        scenarios.append(FRESH_INCIDENT)

    async with Slack(cfg.slack_bot_token) as sl:
        ws = await sl.workspace_ref()
        invite_user_ids = await _resolve_invite_user_ids(sl, raw=args.invite)
        log.info(
            "seeding workspace %s (%s) with %d scenarios%s%s",
            ws.team_domain, ws.team_id, len(scenarios),
            " [DRY RUN]" if args.dry_run else "",
            f", inviting {', '.join(invite_user_ids)}" if invite_user_ids else "",
        )
        created: list[tuple[str, str]] = []  # (channel_name, channel_id)
        total = 0
        for scenario in scenarios:
            cid, n = await _seed_scenario(
                sl, scenario, dry_run=args.dry_run,
                invite_user_ids=invite_user_ids,
            )
            created.append((scenario.channel, cid))
            total += n
        log.info("done. posted %d messages across %d channels", total, len(scenarios))

        # Print one-click join URLs for whoever's running this — even if
        # --invite wasn't given, these get you into the channels in two clicks.
        if not args.dry_run:
            print(f"\n→ open these in {ws.team_domain}.slack.com to view / join:")
            for name, cid in created:
                print(f"  #{name}")
                print(f"     https://{ws.team_domain}.slack.com/archives/{cid}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="seed_slack_demo", description=__doc__,
    )
    parser.add_argument(
        "--past", action="store_true",
        help="Only seed the past (resolved) incident channels.",
    )
    parser.add_argument(
        "--fresh", action="store_true",
        help="Only seed the fresh #incident-2026-05-auth-down channel.",
    )
    parser.add_argument(
        "--human", action="store_true",
        help=(
            "Only seed the human-flavored channel — bot impersonates Chetan "
            "and Henning so the conversation looks multi-author. Requires "
            "the `chat:write.customize` scope on the bot."
        ),
    )
    parser.add_argument(
        "--invite",
        metavar="USERS",
        default=os.getenv("DEMO_INVITE_USERS") or os.getenv("DEMO_INVITE_USER"),
        help=(
            "Comma-separated Slack user_ids (e.g. U0B1ABC2DEF,U0B1XYZ4567) "
            "or emails to invite to every channel as it's created. Email "
            "lookup needs `users:read.email`; member IDs always work. "
            "Defaults to $DEMO_INVITE_USERS from .env (or legacy $DEMO_INVITE_USER)."
        ),
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Print what would happen without making any API calls.",
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
