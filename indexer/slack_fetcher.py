"""Thin async client over the Slack Web API.

Only covers what the indexer needs: workspace info, channel list,
channel history, thread replies, and user lookup.

Pagination follows Slack's `response_metadata.next_cursor` style. Rate
limits: most endpoints are Tier 3 (50+ rpm) which is plenty for a PoC.
We respect `Retry-After` on 429 just in case.

Required bot scopes:
    channels:read       list public channels
    channels:history    read public-channel messages and threads
    users:read          resolve user_id -> display name
    (optional) groups:read / groups:history for private channels

Get a bot token at https://api.slack.com/apps -> Create app ->
Install to workspace -> "Bot User OAuth Token" (xoxb-...).
"""

from __future__ import annotations

import asyncio
import fnmatch
import logging
from dataclasses import dataclass
from typing import Any, AsyncIterator

import httpx

log = logging.getLogger(__name__)

API_ROOT = "https://slack.com/api"


@dataclass(frozen=True)
class WorkspaceRef:
    """Identifies which workspace a row belongs to.

    `team_id` (e.g. T01ABC2DEF) is what Slack hands back from `auth.test`.
    `team_domain` (e.g. spotify-2) is the human-readable handle used in
    permalinks like https://<team_domain>.slack.com/archives/<channel>/p<ts>.
    """

    team_id: str
    team_domain: str

    @property
    def slug(self) -> str:
        return self.team_id


class Slack:
    def __init__(self, bot_token: str, *, concurrency: int = 4):
        if not bot_token.startswith(("xoxb-", "xoxp-")):
            raise ValueError(
                "SLACK_BOT_TOKEN should start with xoxb- (bot) or xoxp- (user)"
            )
        self._client = httpx.AsyncClient(
            base_url=API_ROOT,
            headers={
                "Authorization": f"Bearer {bot_token}",
                "User-Agent": "hydrant-indexer",
            },
            timeout=30.0,
        )
        self._sem = asyncio.Semaphore(concurrency)

    async def __aenter__(self) -> "Slack":
        return self

    async def __aexit__(self, *exc: object) -> None:
        await self._client.aclose()

    # --- core HTTP helpers --------------------------------------------------

    async def _post(self, method: str, **params: Any) -> dict:
        """Slack's Web API takes POST + form-encoded params for everything.
        Returns the parsed JSON; raises on `ok: false`.
        """
        async with self._sem:
            for attempt in range(5):
                resp = await self._client.post(f"/{method}", data=params)
                if resp.status_code == 429:
                    wait = float(resp.headers.get("retry-after", "5"))
                    log.warning("slack 429 on %s, sleeping %.1fs", method, wait)
                    await asyncio.sleep(min(wait, 60))
                    continue
                resp.raise_for_status()
                data = resp.json()
                if not data.get("ok"):
                    err = data.get("error", "unknown")
                    # Some errors are retryable (e.g. ratelimited reported as 200)
                    if err == "ratelimited":
                        await asyncio.sleep(2**attempt)
                        continue
                    raise SlackError(method, err, data)
                return data
            raise RuntimeError(f"slack {method} exhausted retries")

    async def _paginate(self, method: str, **params: Any) -> AsyncIterator[dict]:
        """Yield items from a paginated endpoint.

        The collection field name varies by endpoint (`channels`, `messages`,
        `members`, …). Slack always wraps results in *some* list field at the
        top level; we discover it by taking the first list-valued key that
        isn't `messages_metadata` or similar bookkeeping.
        """
        params.setdefault("limit", 200)
        cursor: str | None = None
        while True:
            if cursor:
                params["cursor"] = cursor
            data = await self._post(method, **params)
            # Find the list field — Slack uses different names per endpoint
            for key in ("channels", "messages", "members", "files"):
                if key in data and isinstance(data[key], list):
                    for item in data[key]:
                        yield item
                    break
            cursor = (data.get("response_metadata") or {}).get("next_cursor") or None
            if not cursor:
                return

    # --- public API ---------------------------------------------------------

    async def auth_test(self) -> dict:
        """Returns workspace info: {team, team_id, user, user_id, url, …}."""
        return await self._post("auth.test")

    async def workspace_ref(self) -> WorkspaceRef:
        info = await self.auth_test()
        url = info.get("url", "")  # https://<team_domain>.slack.com/
        domain = url.split("//", 1)[-1].split(".", 1)[0] if url else info.get("team", "")
        return WorkspaceRef(team_id=info["team_id"], team_domain=domain)

    async def channels(
        self,
        *,
        types: str = "public_channel",
        match: list[str] | None = None,
    ) -> AsyncIterator[dict]:
        """Yield channel dicts. `match` is a list of fnmatch globs against
        channel name (e.g. ['incident-*', 'eng-platform']) — empty/None
        means "all channels the bot can see".
        """
        async for ch in self._paginate(
            "conversations.list",
            types=types,
            exclude_archived="false",
        ):
            if match:
                name = ch.get("name", "")
                if not any(fnmatch.fnmatch(name, pat) for pat in match):
                    continue
            yield ch

    async def history(
        self, channel_id: str, *, oldest: str | None = None,
    ) -> AsyncIterator[dict]:
        """Top-level messages in a channel, newest first.

        `oldest` is a Slack ts (e.g. "1700000000.000000") to bound the fetch
        — useful for incremental indexing. Threaded replies are fetched
        separately via `replies()`.
        """
        params: dict[str, Any] = {"channel": channel_id, "limit": 200}
        if oldest:
            params["oldest"] = oldest
        async for msg in self._paginate("conversations.history", **params):
            yield msg

    async def replies(self, channel_id: str, thread_ts: str) -> AsyncIterator[dict]:
        """Yield thread replies in chronological order.

        The first message returned is the parent itself (Slack quirk) —
        callers should drop it if they've already seen it from history().
        """
        async for msg in self._paginate(
            "conversations.replies", channel=channel_id, ts=thread_ts,
        ):
            yield msg

    async def user_info(self, user_id: str) -> dict | None:
        """Fetch a user's profile. Returns None for unknown IDs (e.g. bots
        from other workspaces) so callers can fall back to the raw user_id.
        """
        try:
            data = await self._post("users.info", user=user_id)
            return data.get("user")
        except SlackError as e:
            if e.code in ("user_not_found", "user_not_visible"):
                return None
            raise

    # --- write side (requires channels:manage, chat:write[.public]) ---------
    # These methods are used by scripts/seed_slack_demo.py and (later) by an
    # MCP tool that posts the synthesized incident summary back into a channel.

    async def create_channel(
        self, name: str, *, is_private: bool = False,
    ) -> dict:
        """Create a public (or private) channel. Idempotent: if a channel
        with this name already exists, looks it up and returns its dict
        instead of failing.

        Slack lower-cases names + replaces invalid chars itself, but the
        server returns `name_taken` only for *exact* matches. We compare
        case-insensitively when falling back.
        """
        try:
            data = await self._post(
                "conversations.create",
                name=name,
                is_private="true" if is_private else "false",
            )
            return data["channel"]
        except SlackError as e:
            if e.code != "name_taken":
                raise
            # Look up the existing channel.
            wanted = name.lower()
            async for ch in self.channels(
                types="public_channel,private_channel" if is_private else "public_channel",
            ):
                if (ch.get("name") or "").lower() == wanted:
                    return ch
            raise  # name_taken but we can't see it — surface the error

    async def post_message(
        self,
        channel_id: str,
        text: str,
        *,
        thread_ts: str | None = None,
        unfurl_links: bool = False,
        username: str | None = None,
        icon_emoji: str | None = None,
        icon_url: str | None = None,
    ) -> dict:
        """Post a message. Returns the full response (incl. `ts` you'll
        want for thread replies).

        Setting `username` + `icon_emoji` overrides the bot's identity per
        message — useful for seeding realistic-looking conversation where
        each "speaker" is one of your teammates. Requires the
        `chat:write.customize` scope on the bot.
        """
        params: dict[str, Any] = {
            "channel": channel_id,
            "text": text,
            "unfurl_links": "true" if unfurl_links else "false",
            "unfurl_media": "false",
        }
        if thread_ts:
            params["thread_ts"] = thread_ts
        if username:
            params["username"] = username
        if icon_emoji:
            params["icon_emoji"] = icon_emoji
        if icon_url:
            params["icon_url"] = icon_url
        return await self._post("chat.postMessage", **params)

    async def set_channel_topic(self, channel_id: str, topic: str) -> dict:
        """Useful for tagging an incident channel with severity / status."""
        return await self._post(
            "conversations.setTopic", channel=channel_id, topic=topic,
        )

    async def unarchive_channel(self, channel_id: str) -> dict:
        """Unarchive a channel. Idempotent: if the channel is already
        active, Slack returns `not_archived` which we swallow.

        Requires `channels:manage` (public) or `groups:write` (private).
        """
        try:
            return await self._post("conversations.unarchive", channel=channel_id)
        except SlackError as e:
            if e.code == "not_archived":
                return e.data
            raise

    async def invite_to_channel(self, channel_id: str, user_ids: list[str]) -> dict:
        """Invite one or more users to a channel.

        Requires `channels:manage` (or `groups:write` for private channels).
        Idempotent: Slack returns `already_in_channel` for users already
        present, which we swallow.
        """
        try:
            return await self._post(
                "conversations.invite",
                channel=channel_id,
                users=",".join(user_ids),
            )
        except SlackError as e:
            if e.code in ("already_in_channel", "cant_invite_self"):
                return e.data
            raise

    async def lookup_user_by_email(self, email: str) -> dict | None:
        """Resolve a workspace email -> user dict. Requires `users:read.email`.

        Returns None if the email isn't found or the scope is missing — so
        callers can fall back to a hardcoded user ID without crashing.
        """
        try:
            data = await self._post("users.lookupByEmail", email=email)
            return data.get("user")
        except SlackError as e:
            if e.code in ("users_not_found", "missing_scope"):
                return None
            raise


class SlackError(RuntimeError):
    def __init__(self, method: str, code: str, data: dict):
        super().__init__(f"slack {method} -> {code}")
        self.method = method
        self.code = code
        self.data = data
