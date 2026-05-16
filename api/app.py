"""FastAPI app powering the web demo.

Endpoints:
  GET /api/repos           — indexed repos
  GET /api/graph           — initial graph payload (top-N by degree)
  GET /api/chat            — SSE streaming chat with tool use

The MCP tool functions are reused in-process from mcp_server.tools.
"""

from __future__ import annotations

import asyncio
import json
import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse

from mcp_server import tools as mcp_tools
from mcp_server.state import STATE

from .llm import run_chat

log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await STATE.startup()
    try:
        yield
    finally:
        await STATE.shutdown()


app = FastAPI(title="Hydrant web demo", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/repos")
async def repos() -> dict[str, Any]:
    return await mcp_tools.list_repos()


@app.get("/api/graph")
async def graph(
    repo: str | None = None,
    limit: int = Query(600, ge=10, le=2000),
    types: str | None = None,
) -> dict[str, Any]:
    """Top-N nodes by degree for the given repo, plus all edges among them."""
    pool = STATE.pool
    assert pool is not None
    type_filter: list[str] | None = None
    if types:
        type_filter = [t.strip() for t in types.split(",") if t.strip()]

    # Reuse the MCP slug resolver for the missing-repo case.
    owner, name = await mcp_tools._resolve_repo_slug(repo)  # type: ignore[attr-defined]
    slug = f"{owner}/{name}"
    prefix = f"gh:{slug}:%"

    async with pool.acquire() as conn:
        # Degree = in_edges + out_edges. Compute per node, take top-N.
        if type_filter:
            rows = await conn.fetch(
                """
                SELECT n.id, n.type, n.source_key, n.props,
                       COALESCE(o.cnt, 0) + COALESCE(i.cnt, 0) AS degree
                FROM nodes n
                LEFT JOIN (SELECT src AS id, count(*) cnt FROM edges GROUP BY src) o ON o.id = n.id
                LEFT JOIN (SELECT dst AS id, count(*) cnt FROM edges GROUP BY dst) i ON i.id = n.id
                WHERE n.source_key LIKE $1 AND n.type = ANY($3::text[])
                ORDER BY degree DESC, n.id ASC
                LIMIT $2
                """,
                prefix, limit, type_filter,
            )
        else:
            rows = await conn.fetch(
                """
                SELECT n.id, n.type, n.source_key, n.props,
                       COALESCE(o.cnt, 0) + COALESCE(i.cnt, 0) AS degree
                FROM nodes n
                LEFT JOIN (SELECT src AS id, count(*) cnt FROM edges GROUP BY src) o ON o.id = n.id
                LEFT JOIN (SELECT dst AS id, count(*) cnt FROM edges GROUP BY dst) i ON i.id = n.id
                WHERE n.source_key LIKE $1
                ORDER BY degree DESC, n.id ASC
                LIMIT $2
                """,
                prefix, limit,
            )
        node_ids = [int(r["id"]) for r in rows]

        edges_rows = []
        if node_ids:
            edges_rows = await conn.fetch(
                """
                SELECT src, dst, type, props
                FROM edges
                WHERE src = ANY($1::bigint[]) AND dst = ANY($1::bigint[])
                """,
                node_ids,
            )

    return {
        "repo": slug,
        "nodes": [
            {
                "id": int(r["id"]),
                "type": r["type"],
                "source_key": r["source_key"],
                "props": r["props"],
                "degree": int(r["degree"]),
            }
            for r in rows
        ],
        "edges": [
            {
                "src": int(e["src"]),
                "dst": int(e["dst"]),
                "type": e["type"],
                "props": e["props"],
            }
            for e in edges_rows
        ],
    }


@app.get("/api/chat")
async def chat(
    q: str = Query(..., min_length=1, max_length=4000),
    history: str = Query("[]"),
    repo: str | None = None,
):
    """Server-Sent Events stream of a tool-using chat turn."""
    cfg = STATE.cfg
    if cfg is None or not cfg.openrouter_api_key:
        raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY not set in .env")

    try:
        history_msgs = json.loads(history)
        if not isinstance(history_msgs, list):
            history_msgs = []
    except json.JSONDecodeError:
        history_msgs = []

    # If a repo was selected, pin it into the user message so the LLM
    # passes it through to tools that take an optional `repo`.
    user_message = q
    if repo:
        user_message = f"(Repo context: {repo})\n\n{q}"

    queue: asyncio.Queue[dict[str, Any] | None] = asyncio.Queue()

    async def emit(event: str, data: dict[str, Any]) -> None:
        await queue.put({"event": event, "data": json.dumps(data)})

    async def producer() -> None:
        try:
            await run_chat(
                api_key=cfg.openrouter_api_key,
                model=cfg.openrouter_model,
                user_message=user_message,
                history=history_msgs,
                emit=emit,
            )
        except Exception as e:  # noqa: BLE001
            log.exception("chat producer error")
            await emit("error", {"message": f"{type(e).__name__}: {e}"})
            await emit("done", {})
        finally:
            await queue.put(None)

    asyncio.create_task(producer())

    async def event_gen():
        while True:
            item = await queue.get()
            if item is None:
                break
            yield item

    return EventSourceResponse(event_gen())
