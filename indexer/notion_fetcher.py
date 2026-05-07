"""Thin async client over the Notion REST API.

Only covers what the indexer needs: search (to discover what the
integration has access to), database query, page metadata, and the
recursive block tree behind a page's content.

Auth: an internal-integration token (starts ntn_… or secret_…). Pass it
to the constructor; the Authorization and Notion-Version headers are
added automatically.

Pagination: Notion uses `start_cursor` + `next_cursor` + `has_more`
on every list endpoint. `_paginate_post` handles it generically.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from typing import Any, AsyncIterator

import httpx

log = logging.getLogger(__name__)

API_ROOT = "https://api.notion.com/v1"
NOTION_VERSION = "2022-06-28"

# Notion block types that carry rich_text we want to embed. Anything not
# in this set is silently skipped (dividers, images, etc).
TEXT_BLOCK_TYPES = {
    "paragraph",
    "heading_1",
    "heading_2",
    "heading_3",
    "bulleted_list_item",
    "numbered_list_item",
    "to_do",
    "toggle",
    "quote",
    "callout",
    "code",
}


@dataclass(frozen=True)
class NotionRef:
    """Lightweight handle so source-keys can stay stable across runs.

    Notion has no top-level "workspace ID" in the public API, so we use
    the bot user's workspace_name (returned by GET /v1/users/me) as the
    namespace.
    """

    workspace_name: str

    @property
    def slug(self) -> str:
        return self.workspace_name


class Notion:
    def __init__(self, api_key: str, *, concurrency: int = 4):
        if not api_key.startswith(("ntn_", "secret_")):
            raise ValueError(
                "NOTION_API_KEY should start with ntn_ or secret_ — copy it "
                "from your integration's settings page."
            )
        self._client = httpx.AsyncClient(
            base_url=API_ROOT,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Notion-Version": NOTION_VERSION,
                "Content-Type": "application/json",
                "User-Agent": "ctx-mcp-indexer",
            },
            timeout=30.0,
        )
        self._sem = asyncio.Semaphore(concurrency)

    async def __aenter__(self) -> "Notion":
        return self

    async def __aexit__(self, *exc: object) -> None:
        await self._client.aclose()

    async def _request(
        self, method: str, path: str, *, json: dict | None = None,
    ) -> dict:
        async with self._sem:
            for attempt in range(5):
                resp = await self._client.request(method, path, json=json)
                if resp.status_code == 429:
                    wait = float(resp.headers.get("retry-after", "5"))
                    log.warning("notion 429, sleeping %.1fs", wait)
                    await asyncio.sleep(min(wait, 60))
                    continue
                if resp.status_code in (502, 503, 504):
                    await asyncio.sleep(2**attempt)
                    continue
                resp.raise_for_status()
                return resp.json()
            resp.raise_for_status()
            return resp.json()

    async def _paginate_post(
        self, path: str, body: dict | None = None,
    ) -> AsyncIterator[dict]:
        body = dict(body or {})
        body.setdefault("page_size", 100)
        while True:
            data = await self._request("POST", path, json=body)
            for item in data.get("results", []):
                yield item
            if not data.get("has_more"):
                return
            body["start_cursor"] = data.get("next_cursor")

    async def _paginate_get(
        self, path: str, params: dict | None = None,
    ) -> AsyncIterator[dict]:
        """Pagination for GET endpoints (e.g. block children).

        Notion encodes cursor in query params here, not the body.
        """
        params = dict(params or {})
        params.setdefault("page_size", 100)
        while True:
            data = await self._request("GET", path)
            # The HTTP client already applied params; add cursor on subsequent rounds
            for item in data.get("results", []):
                yield item
            if not data.get("has_more"):
                return
            cursor = data.get("next_cursor")
            # rebuild path with cursor query
            sep = "&" if "?" in path else "?"
            path = f"{path}{sep}start_cursor={cursor}"

    # --- public API ---------------------------------------------------------

    async def me(self) -> dict:
        """GET /users/me — auth test + workspace name."""
        return await self._request("GET", "/users/me")

    async def workspace_ref(self) -> NotionRef:
        info = await self.me()
        # bot users carry a `bot.workspace_name` field
        bot = (info.get("bot") or {})
        name = bot.get("workspace_name") or info.get("name") or "default"
        return NotionRef(workspace_name=name)

    async def search(self, *, filter_type: str | None = None) -> AsyncIterator[dict]:
        """List everything the integration has access to.

        `filter_type` can be 'page' or 'database' to scope. Without it you
        get both interleaved.
        """
        body: dict[str, Any] = {}
        if filter_type:
            body["filter"] = {"value": filter_type, "property": "object"}
        async for item in self._paginate_post("/search", body):
            yield item

    async def database_query(self, database_id: str) -> AsyncIterator[dict]:
        """Yield each page in a database.

        Database rows in Notion *are* pages — same shape as a free-standing
        page, just with a `parent.database_id` and structured properties.
        """
        async for page in self._paginate_post(
            f"/databases/{database_id}/query", {},
        ):
            yield page

    async def page(self, page_id: str) -> dict:
        return await self._request("GET", f"/pages/{page_id}")

    async def block_children(self, block_id: str) -> AsyncIterator[dict]:
        async for blk in self._paginate_get(
            f"/blocks/{block_id}/children",
        ):
            yield blk


# --- text extraction helpers (pure functions, easy to test) ---------------


def rich_text_plain(rich_text: list[dict] | None) -> str:
    """Flatten Notion's rich_text array to plain string.

    Each item has at least {plain_text: str}. Annotations (bold/italic/…)
    and links are dropped — we want the raw string for embedding.
    """
    if not rich_text:
        return ""
    return "".join(rt.get("plain_text") or "" for rt in rich_text)


def block_to_text(block: dict) -> str:
    """Extract plain text from a single block, prefixed with a marker
    appropriate for the block type so the embedded text reads naturally.

    Returns "" if the block has no text content (divider, image, …).
    """
    btype = block.get("type")
    if btype not in TEXT_BLOCK_TYPES:
        return ""
    payload = block.get(btype) or {}
    text = rich_text_plain(payload.get("rich_text"))
    if not text:
        return ""
    if btype == "heading_1":
        return f"# {text}"
    if btype == "heading_2":
        return f"## {text}"
    if btype == "heading_3":
        return f"### {text}"
    if btype == "bulleted_list_item":
        return f"- {text}"
    if btype == "numbered_list_item":
        return f"1. {text}"
    if btype == "to_do":
        check = "x" if payload.get("checked") else " "
        return f"- [{check}] {text}"
    if btype == "quote":
        return f"> {text}"
    if btype == "code":
        lang = payload.get("language") or ""
        return f"```{lang}\n{text}\n```"
    return text


def page_title(page: dict) -> str:
    """Best-effort title extraction.

    Free-standing pages have a `properties.title.title` rich_text array.
    Database rows have one property of type=title — its name varies (often
    'Name' or 'Title'). We take whichever we find first.
    """
    props = page.get("properties") or {}
    # Free pages: properties.title.title
    if "title" in props and (props["title"] or {}).get("type") == "title":
        return rich_text_plain(props["title"].get("title"))
    # Database rows: one property with type=title, key name varies
    for prop in props.values():
        if (prop or {}).get("type") == "title":
            return rich_text_plain(prop.get("title"))
    return "(untitled)"
