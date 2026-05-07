"""Thin async client over the Linear GraphQL API.

Linear has one endpoint (https://api.linear.app/graphql) and uses
cursor-based pagination on every collection field. The patterns:

    query MyQuery($cursor: String) {
      issues(first: 100, after: $cursor) {
        nodes  { … }
        pageInfo { endCursor hasNextPage }
      }
    }

`_paginate` runs that loop for any collection-shaped query.

Auth: a personal API key (starts lin_api_…) — passed in the
Authorization header without a Bearer prefix.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from typing import Any, AsyncIterator

import httpx

log = logging.getLogger(__name__)

API_URL = "https://api.linear.app/graphql"


# --- GraphQL fragments ----------------------------------------------------
# Defined as module-level constants so we can keep query strings short.

ISSUE_FIELDS = """
  id
  identifier
  title
  description
  url
  priority
  createdAt
  completedAt
  state { id name type }
  team { id key name }
  assignee { id name displayName }
  creator { id name displayName }
  labels { nodes { id name } }
"""

COMMENT_FIELDS = """
  id
  body
  url
  createdAt
  user { id name displayName }
  issue { id identifier }
"""

USER_FIELDS = """
  id
  name
  displayName
  email
  active
  url
"""

TEAM_FIELDS = """
  id
  key
  name
  description
"""


@dataclass(frozen=True)
class WorkspaceRef:
    """Linear's authenticated viewer + their organization name.

    `org_url_key` is the slug visible in https://linear.app/<key>/… URLs;
    we use it as the source-key namespace.
    """

    org_url_key: str
    viewer_id: str
    viewer_name: str

    @property
    def slug(self) -> str:
        return self.org_url_key


class Linear:
    def __init__(self, api_key: str, *, concurrency: int = 4):
        if not api_key.startswith("lin_api_"):
            log.warning(
                "LINEAR_API_KEY doesn't start with lin_api_ — that's fine "
                "for OAuth tokens but may indicate a mis-pasted key."
            )
        self._client = httpx.AsyncClient(
            base_url=API_URL,
            headers={
                "Authorization": api_key,
                "Content-Type": "application/json",
                "User-Agent": "ctx-mcp-indexer",
            },
            timeout=30.0,
        )
        self._sem = asyncio.Semaphore(concurrency)

    async def __aenter__(self) -> "Linear":
        return self

    async def __aexit__(self, *exc: object) -> None:
        await self._client.aclose()

    async def _query(
        self, query: str, variables: dict | None = None,
    ) -> dict:
        async with self._sem:
            for attempt in range(5):
                resp = await self._client.post(
                    "",
                    json={"query": query, "variables": variables or {}},
                )
                if resp.status_code == 429:
                    wait = float(resp.headers.get("retry-after", "5"))
                    log.warning("linear 429, sleeping %.1fs", wait)
                    await asyncio.sleep(min(wait, 60))
                    continue
                if resp.status_code in (502, 503, 504):
                    await asyncio.sleep(2**attempt)
                    continue
                resp.raise_for_status()
                payload = resp.json()
                if payload.get("errors"):
                    # GraphQL surfaces 200 OK with errors[] for things like
                    # auth failures — surface them clearly.
                    raise LinearError(payload["errors"])
                return payload.get("data") or {}
            resp.raise_for_status()
            return {}

    async def _paginate(
        self, query: str, root_field: str, variables: dict | None = None,
    ) -> AsyncIterator[dict]:
        """Drive cursor-based pagination over a top-level connection field
        in `query`. The query must accept a `$cursor: String` variable and
        spread `pageInfo { endCursor hasNextPage }` next to `nodes`.
        """
        cursor: str | None = None
        vars_: dict[str, Any] = dict(variables or {})
        while True:
            vars_["cursor"] = cursor
            data = await self._query(query, vars_)
            conn = data.get(root_field) or {}
            for node in conn.get("nodes", []):
                yield node
            page_info = conn.get("pageInfo") or {}
            if not page_info.get("hasNextPage"):
                return
            cursor = page_info.get("endCursor")

    # --- public API ---------------------------------------------------------

    async def workspace_ref(self) -> WorkspaceRef:
        data = await self._query(
            """
            query {
              viewer { id name displayName }
              organization { urlKey name }
            }
            """,
        )
        viewer = data.get("viewer") or {}
        org = data.get("organization") or {}
        return WorkspaceRef(
            org_url_key=org.get("urlKey") or "default",
            viewer_id=viewer.get("id") or "",
            viewer_name=viewer.get("displayName") or viewer.get("name") or "",
        )

    async def teams(self) -> AsyncIterator[dict]:
        query = f"""
        query Teams($cursor: String) {{
          teams(first: 100, after: $cursor) {{
            nodes {{ {TEAM_FIELDS} }}
            pageInfo {{ endCursor hasNextPage }}
          }}
        }}
        """
        async for t in self._paginate(query, "teams"):
            yield t

    async def issues(
        self, *, team_keys: list[str] | None = None,
    ) -> AsyncIterator[dict]:
        """Yield issues, optionally filtered to a list of team keys (e.g.
        ['ENG', 'OPS']).

        Linear lets us filter server-side via the `filter` arg — much faster
        than fetching everything and pruning client-side.
        """
        team_filter = ""
        variables: dict[str, Any] = {}
        if team_keys:
            team_filter = ", filter: { team: { key: { in: $teamKeys } } }"
            variables["teamKeys"] = team_keys
            decl = "$cursor: String, $teamKeys: [String!]"
        else:
            decl = "$cursor: String"
        query = f"""
        query Issues({decl}) {{
          issues(first: 100, after: $cursor{team_filter}) {{
            nodes {{ {ISSUE_FIELDS} }}
            pageInfo {{ endCursor hasNextPage }}
          }}
        }}
        """
        async for it in self._paginate(query, "issues", variables):
            yield it

    async def comments(
        self, *, team_keys: list[str] | None = None,
    ) -> AsyncIterator[dict]:
        """All comments, optionally scoped to issues belonging to specific
        team keys."""
        team_filter = ""
        variables: dict[str, Any] = {}
        if team_keys:
            team_filter = ", filter: { issue: { team: { key: { in: $teamKeys } } } }"
            variables["teamKeys"] = team_keys
            decl = "$cursor: String, $teamKeys: [String!]"
        else:
            decl = "$cursor: String"
        query = f"""
        query Comments({decl}) {{
          comments(first: 100, after: $cursor{team_filter}) {{
            nodes {{ {COMMENT_FIELDS} }}
            pageInfo {{ endCursor hasNextPage }}
          }}
        }}
        """
        async for c in self._paginate(query, "comments", variables):
            yield c

    async def users(self) -> AsyncIterator[dict]:
        query = f"""
        query Users($cursor: String) {{
          users(first: 100, after: $cursor) {{
            nodes {{ {USER_FIELDS} }}
            pageInfo {{ endCursor hasNextPage }}
          }}
        }}
        """
        async for u in self._paginate(query, "users"):
            yield u

    # --- write-side mutations -----------------------------------------------
    # Used by the MCP tools that create/update incident tickets and post
    # status updates. Kept at the fetcher layer so the GraphQL stays in
    # one place and the MCP tools become thin orchestration.

    async def find_issue_by_identifier(self, identifier: str) -> dict | None:
        """Resolve an identifier like 'CLI-5' to its full issue node, or
        None if no such issue exists in any team this token can see.

        Linear identifiers are case-insensitive at the API level but we
        upper-case here to be defensive — agents sometimes pass 'cli-5'."""
        data = await self._query(
            """
            query FindByIdentifier($number: Float!, $teamKey: String!) {
              issues(filter: { number: { eq: $number },
                              team:   { key:    { eq: $teamKey } } }, first: 1) {
                nodes {
                  id identifier title url
                  state  { id name type }
                  team   { id key name }
                  priority description
                }
              }
            }
            """,
            self._split_identifier(identifier),
        )
        nodes = (data.get("issues") or {}).get("nodes", [])
        return nodes[0] if nodes else None

    @staticmethod
    def _split_identifier(identifier: str) -> dict[str, Any]:
        """'CLI-5' -> {'teamKey': 'CLI', 'number': 5}.

        Linear's filter API takes team-key + issue-number rather than the
        composite identifier string, so we split here.
        """
        ident = identifier.strip().upper()
        if "-" not in ident:
            raise ValueError(
                f"identifier {identifier!r} should look like 'TEAM-N' (e.g. 'CLI-5')"
            )
        team_key, _, number = ident.rpartition("-")
        try:
            return {"teamKey": team_key, "number": int(number)}
        except ValueError as e:
            raise ValueError(
                f"could not parse number from identifier {identifier!r}"
            ) from e

    async def state_id_for(
        self, *, team_id: str, state_name: str,
    ) -> str | None:
        """Resolve a state name (e.g. 'In Progress', 'Done') to a state ID
        in the given team's workflow.

        Falls back to type matching if the exact name doesn't exist —
        e.g. asking for 'Done' on a team that calls it 'Completed' will
        still resolve via the 'completed' type.
        """
        data = await self._query(
            """
            query TeamStates($team: ID!) {
              workflowStates(filter: { team: { id: { eq: $team } } }) {
                nodes { id name type }
              }
            }
            """,
            {"team": team_id},
        )
        states = (data.get("workflowStates") or {}).get("nodes", [])
        # Exact name match first
        for st in states:
            if (st.get("name") or "").lower() == state_name.lower():
                return st["id"]
        # Type-aware fallback
        type_aliases = {
            "in progress": "started",
            "started":     "started",
            "todo":        "unstarted",
            "backlog":     "backlog",
            "triage":      "triage",
            "done":        "completed",
            "completed":   "completed",
            "cancelled":   "canceled",
            "canceled":    "canceled",
        }
        target_type = type_aliases.get(state_name.lower())
        if target_type:
            for st in states:
                if st.get("type") == target_type:
                    return st["id"]
        return None

    async def create_issue(
        self,
        *,
        team_id: str,
        title: str,
        description: str,
        priority: int | None = None,
        state_id: str | None = None,
        label_ids: list[str] | None = None,
    ) -> dict:
        """Create an issue and return its full node (id, identifier, url, …).

        priority: 0 none, 1 urgent, 2 high, 3 normal, 4 low. Defaults to
        whatever Linear's team default is when omitted.
        """
        input_data: dict[str, Any] = {
            "teamId":      team_id,
            "title":       title,
            "description": description,
        }
        if priority is not None:
            input_data["priority"] = priority
        if state_id:
            input_data["stateId"] = state_id
        if label_ids:
            input_data["labelIds"] = label_ids
        data = await self._query(
            """
            mutation CreateIssue($input: IssueCreateInput!) {
              issueCreate(input: $input) {
                success
                issue {
                  id identifier title url priority
                  state { id name type }
                  team  { id key name }
                }
              }
            }
            """,
            {"input": input_data},
        )
        res = data.get("issueCreate") or {}
        if not res.get("success"):
            raise LinearError(
                [{"message": f"issueCreate failed: {res!r}"}]
            )
        return res["issue"]

    async def create_comment(self, *, issue_id: str, body: str) -> dict:
        """Append a comment to an issue. Returns {id, url, body}."""
        data = await self._query(
            """
            mutation CreateComment($input: CommentCreateInput!) {
              commentCreate(input: $input) {
                success
                comment { id url body }
              }
            }
            """,
            {"input": {"issueId": issue_id, "body": body}},
        )
        res = data.get("commentCreate") or {}
        if not res.get("success"):
            raise LinearError(
                [{"message": f"commentCreate failed: {res!r}"}]
            )
        return res["comment"]

    async def update_issue(
        self,
        *,
        issue_id: str,
        state_id: str | None = None,
        priority: int | None = None,
        description: str | None = None,
        title: str | None = None,
    ) -> dict:
        """Partial update — only the fields you pass get sent."""
        input_data: dict[str, Any] = {}
        if state_id is not None:
            input_data["stateId"] = state_id
        if priority is not None:
            input_data["priority"] = priority
        if description is not None:
            input_data["description"] = description
        if title is not None:
            input_data["title"] = title
        if not input_data:
            raise ValueError(
                "update_issue called with no fields to update — "
                "pass at least one of state_id, priority, description, title."
            )
        data = await self._query(
            """
            mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
              issueUpdate(id: $id, input: $input) {
                success
                issue {
                  id identifier title url priority
                  state { id name type }
                }
              }
            }
            """,
            {"id": issue_id, "input": input_data},
        )
        res = data.get("issueUpdate") or {}
        if not res.get("success"):
            raise LinearError(
                [{"message": f"issueUpdate failed: {res!r}"}]
            )
        return res["issue"]


class LinearError(RuntimeError):
    def __init__(self, errors: list[dict]):
        self.errors = errors
        msg = "; ".join(e.get("message", "?") for e in errors)
        super().__init__(f"linear graphql: {msg}")
