"""Thin async client over the GitHub REST API.

Only covers what the indexer needs: repo metadata, issues, pull requests
(including the per-PR file list), commit metadata, and comments.

Pagination follows RFC-5988 `Link: <...>; rel="next"` headers.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any, AsyncIterator

import httpx

API_ROOT = "https://api.github.com"


@dataclass(frozen=True)
class RepoRef:
    owner: str
    name: str

    @classmethod
    def parse(cls, url_or_slug: str) -> "RepoRef":
        s = url_or_slug.strip().rstrip("/")
        if s.startswith(("http://", "https://")):
            # https://github.com/<owner>/<name>(.git)?
            s = s.split("github.com/", 1)[1]
        if s.endswith(".git"):
            s = s[:-4]
        owner, _, name = s.partition("/")
        if not owner or not name:
            raise ValueError(f"cannot parse repo from {url_or_slug!r}")
        return cls(owner=owner, name=name)

    @property
    def slug(self) -> str:
        return f"{self.owner}/{self.name}"


class GitHub:
    def __init__(self, token: str, *, per_page: int = 100, concurrency: int = 4):
        self._client = httpx.AsyncClient(
            base_url=API_ROOT,
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": "ctx-mcp-indexer",
            },
            timeout=30.0,
        )
        self._per_page = per_page
        self._sem = asyncio.Semaphore(concurrency)

    async def __aenter__(self) -> "GitHub":
        return self

    async def __aexit__(self, *exc: object) -> None:
        await self._client.aclose()

    async def _get(self, path: str, **params: Any) -> httpx.Response:
        async with self._sem:
            for attempt in range(5):
                resp = await self._client.get(path, params=params)
                if resp.status_code == 403 and "rate limit" in resp.text.lower():
                    reset = int(resp.headers.get("x-ratelimit-reset", "0"))
                    wait = max(1, reset - int(asyncio.get_event_loop().time()))
                    await asyncio.sleep(min(wait, 30))
                    continue
                if resp.status_code in (502, 503, 504):
                    await asyncio.sleep(2**attempt)
                    continue
                resp.raise_for_status()
                return resp
            resp.raise_for_status()
            return resp

    async def _paginate(self, path: str, **params: Any) -> AsyncIterator[dict]:
        params.setdefault("per_page", self._per_page)
        url: str | None = path
        while url:
            async with self._sem:
                if url.startswith("http"):
                    resp = await self._client.get(url)
                else:
                    resp = await self._client.get(url, params=params)
                resp.raise_for_status()
            for item in resp.json():
                yield item
            link = resp.headers.get("link", "")
            url = None
            for part in link.split(","):
                if 'rel="next"' in part:
                    url = part[part.find("<") + 1 : part.find(">")]
                    params = {}  # next URL already has ?page= in it
                    break

    # --- Public API ---------------------------------------------------------

    async def repo(self, ref: RepoRef) -> dict:
        return (await self._get(f"/repos/{ref.slug}")).json()

    async def issues(self, ref: RepoRef) -> AsyncIterator[dict]:
        # state=all returns issues AND pull requests; we filter PRs out by the
        # presence of the `pull_request` key on each item.
        async for it in self._paginate(f"/repos/{ref.slug}/issues", state="all"):
            if "pull_request" not in it:
                yield it

    async def pulls(self, ref: RepoRef) -> AsyncIterator[dict]:
        async for it in self._paginate(f"/repos/{ref.slug}/pulls", state="all"):
            yield it

    async def pull_files(self, ref: RepoRef, number: int) -> list[dict]:
        # Pagination is rare here but possible for huge PRs; collect all.
        out: list[dict] = []
        async for it in self._paginate(f"/repos/{ref.slug}/pulls/{number}/files"):
            out.append(it)
        return out

    async def commits(self, ref: RepoRef, *, max_count: int = 500) -> AsyncIterator[dict]:
        i = 0
        async for it in self._paginate(f"/repos/{ref.slug}/commits"):
            yield it
            i += 1
            if i >= max_count:
                return

    async def issue_comments(self, ref: RepoRef) -> AsyncIterator[dict]:
        async for it in self._paginate(f"/repos/{ref.slug}/issues/comments"):
            yield it

    async def pull_review_comments(self, ref: RepoRef) -> AsyncIterator[dict]:
        async for it in self._paginate(f"/repos/{ref.slug}/pulls/comments"):
            yield it
