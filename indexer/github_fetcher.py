"""Thin async client over the GitHub REST API.

Only covers what the indexer needs: repo metadata, issues, pull requests
(including the per-PR file list), commit metadata, and comments.

Pagination follows RFC-5988 `Link: <...>; rel="next"` headers.
"""

from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass
from typing import Any, AsyncIterator

import httpx

API_ROOT = "https://api.github.com"

log = logging.getLogger(__name__)


def _rate_limit_wait(resp: httpx.Response) -> float | None:
    """Inspect a non-2xx response and return how many seconds to wait
    before retrying, or None if this isn't a rate-limit response.

    Handles three GitHub signals:
      1. `Retry-After` header → secondary (abuse) rate limit. Authoritative.
      2. `X-RateLimit-Remaining: 0` + `X-RateLimit-Reset` → primary limit.
      3. Body contains "rate limit" → fallback.
    """
    retry_after = resp.headers.get("retry-after")
    if retry_after:
        try:
            return max(1.0, float(retry_after))
        except ValueError:
            pass
    if resp.headers.get("x-ratelimit-remaining") == "0":
        reset = resp.headers.get("x-ratelimit-reset")
        if reset:
            try:
                return max(1.0, float(reset) - time.time())
            except ValueError:
                pass
    if "rate limit" in (resp.text or "").lower():
        return 30.0
    return None


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
    def __init__(self, token: str, *, per_page: int = 100, concurrency: int = 16):
        self._client = httpx.AsyncClient(
            base_url=API_ROOT,
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": "hydrant-indexer",
            },
            timeout=30.0,
        )
        self._per_page = per_page
        self._sem = asyncio.Semaphore(concurrency)

    async def __aenter__(self) -> "GitHub":
        return self

    async def __aexit__(self, *exc: object) -> None:
        await self._client.aclose()

    async def _request(self, url: str, params: dict | None = None) -> httpx.Response:
        """One GET with rate-limit + 5xx retry. `url` may be a relative path
        (params honored) or an absolute next-page URL (params ignored)."""
        max_sleep = 120.0
        async with self._sem:
            for attempt in range(6):
                if url.startswith("http"):
                    resp = await self._client.get(url)
                else:
                    resp = await self._client.get(url, params=params or {})
                if resp.status_code < 400:
                    return resp
                if resp.status_code in (403, 429):
                    wait = _rate_limit_wait(resp)
                    if wait is not None and attempt < 5:
                        sleep_for = min(wait, max_sleep)
                        log.warning(
                            "github %d (rate limit): sleeping %.1fs (attempt %d)",
                            resp.status_code, sleep_for, attempt + 1,
                        )
                        await asyncio.sleep(sleep_for)
                        continue
                if resp.status_code in (502, 503, 504) and attempt < 5:
                    backoff = 2 ** attempt
                    log.warning("github %d (server): sleeping %.1fs", resp.status_code, backoff)
                    await asyncio.sleep(backoff)
                    continue
                resp.raise_for_status()
                return resp  # unreachable; raise_for_status raises on 4xx/5xx
            resp.raise_for_status()
            return resp

    async def _get(self, path: str, **params: Any) -> httpx.Response:
        return await self._request(path, params=params)

    async def _paginate(self, path: str, **params: Any) -> AsyncIterator[dict]:
        params.setdefault("per_page", self._per_page)
        url: str | None = path
        page = 0
        while url:
            resp = await self._request(
                url, params=None if url.startswith("http") else params,
            )
            page += 1
            items = resp.json()
            log.debug("fetched page %d of %s (items=%d)", page, path, len(items))
            for item in items:
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

    async def issues(self, ref: RepoRef, *, max_count: int | None = None) -> AsyncIterator[dict]:
        # state=all returns issues AND pull requests; we filter PRs out by the
        # presence of the `pull_request` key on each item.
        log.info("fetching issues for %s (max %s) ...", ref.slug, max_count or "all")
        n = 0
        async for it in self._paginate(f"/repos/{ref.slug}/issues", state="all"):
            if "pull_request" in it:
                continue
            n += 1
            yield it
            if max_count is not None and n >= max_count:
                break
        log.info("fetched %d issues from %s", n, ref.slug)

    async def pulls(self, ref: RepoRef, *, max_count: int | None = None) -> AsyncIterator[dict]:
        log.info("fetching PRs for %s (max %s) ...", ref.slug, max_count or "all")
        n = 0
        async for it in self._paginate(f"/repos/{ref.slug}/pulls", state="all"):
            n += 1
            yield it
            if max_count is not None and n >= max_count:
                break
        log.info("fetched %d PRs from %s", n, ref.slug)

    async def pull_files(self, ref: RepoRef, number: int) -> list[dict]:
        # Pagination is rare here but possible for huge PRs; collect all.
        out: list[dict] = []
        async for it in self._paginate(f"/repos/{ref.slug}/pulls/{number}/files"):
            out.append(it)
        return out

    async def commits(self, ref: RepoRef, *, max_count: int = 500) -> AsyncIterator[dict]:
        log.info("fetching commits for %s (max %d) ...", ref.slug, max_count)
        i = 0
        async for it in self._paginate(f"/repos/{ref.slug}/commits"):
            yield it
            i += 1
            if i >= max_count:
                break
        log.info("fetched %d commits from %s", i, ref.slug)

    async def issue_comments_for(self, ref: RepoRef, number: int) -> list[dict]:
        """Conversation comments on an issue or PR. PRs are issues in
        GitHub's model, so this endpoint serves both."""
        out: list[dict] = []
        async for it in self._paginate(f"/repos/{ref.slug}/issues/{number}/comments"):
            out.append(it)
        return out

    async def pull_review_comments_for(self, ref: RepoRef, number: int) -> list[dict]:
        """Inline code-review comments on a PR."""
        out: list[dict] = []
        async for it in self._paginate(f"/repos/{ref.slug}/pulls/{number}/comments"):
            out.append(it)
        return out
