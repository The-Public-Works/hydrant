"""OpenRouter tool-use loop for the web demo's chat panel.

Streams text deltas + tool-call events via an `emit` callback (caller wraps
it as SSE). OpenRouter is OpenAI-compatible, so we use the standard
chat.completions tools schema.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Awaitable, Callable

import httpx

from .tool_dispatch import invoke
from .tool_schemas import TOOLS

log = logging.getLogger(__name__)

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MAX_TOOL_LOOPS = 16


SYSTEM_PROMPT = (
    "You are an assistant inside a knowledge-graph demo for a GitHub repository. "
    "You have tools that let you semantically search the indexed repo and walk "
    "its issue/PR/commit/file graph. When asked to investigate a bug or trace "
    "an issue, prefer `trace_issue` first, then drill into specific PRs with "
    "`get_pr_diff` and `git_blame` as needed. "
    "Be decisive: aim to answer in 3-5 tool calls. After that, write your "
    "conclusion from what you've gathered — explicitly state what you don't "
    "know rather than searching further. Avoid redundant queries (don't run "
    "multiple `search_context` calls with paraphrased versions of the same "
    "question). Keep responses concise; the user can see the graph light up "
    "as you call tools."
)


Emit = Callable[[str, dict[str, Any]], Awaitable[None]]


def _summarize(result: Any, limit: int = 600) -> str:
    s = json.dumps(result, default=str)
    return s if len(s) <= limit else s[: limit - 1] + "…"


async def run_chat(
    *,
    api_key: str,
    model: str,
    user_message: str,
    history: list[dict[str, Any]],
    emit: Emit,
) -> None:
    messages: list[dict[str, Any]] = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages.extend(history)
    messages.append({"role": "user", "content": user_message})

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Hydrant web demo",
    }

    async with httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=10.0)) as client:
        for _ in range(MAX_TOOL_LOOPS):
            payload = {
                "model": model,
                "messages": messages,
                "tools": TOOLS,
                "stream": True,
            }
            assistant_text = ""
            tool_calls_buf: dict[int, dict[str, Any]] = {}
            finish_reason: str | None = None

            async with client.stream("POST", OPENROUTER_URL, headers=headers, json=payload) as resp:
                if resp.status_code != 200:
                    body = await resp.aread()
                    msg = body.decode("utf-8", errors="replace")[:500]
                    await emit("error", {"message": f"openrouter {resp.status_code}: {msg}"})
                    return

                async for line in resp.aiter_lines():
                    if not line or not line.startswith("data:"):
                        continue
                    data = line[5:].strip()
                    if data == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data)
                    except json.JSONDecodeError:
                        continue
                    choices = chunk.get("choices") or []
                    if not choices:
                        continue
                    choice = choices[0]
                    delta = choice.get("delta") or {}

                    if (txt := delta.get("content")):
                        assistant_text += txt
                        await emit("text_delta", {"delta": txt})

                    for tc in (delta.get("tool_calls") or []):
                        idx = tc.get("index", 0)
                        slot = tool_calls_buf.setdefault(
                            idx, {"id": "", "name": "", "args": ""},
                        )
                        if tc.get("id"):
                            slot["id"] = tc["id"]
                        fn = tc.get("function") or {}
                        if fn.get("name"):
                            slot["name"] = fn["name"]
                        if fn.get("arguments"):
                            slot["args"] += fn["arguments"]

                    if choice.get("finish_reason"):
                        finish_reason = choice["finish_reason"]

            # End of stream.
            if finish_reason != "tool_calls" or not tool_calls_buf:
                # Final assistant message with no tool calls (or empty).
                await emit("done", {})
                return

            # Append assistant message with tool_calls so OpenRouter can match them.
            messages.append({
                "role": "assistant",
                "content": assistant_text or None,
                "tool_calls": [
                    {
                        "id": slot["id"],
                        "type": "function",
                        "function": {
                            "name": slot["name"],
                            "arguments": slot["args"] or "{}",
                        },
                    }
                    for _, slot in sorted(tool_calls_buf.items())
                ],
            })

            # Run each tool, emit events, and append tool results.
            for _, slot in sorted(tool_calls_buf.items()):
                name = slot["name"]
                try:
                    args = json.loads(slot["args"]) if slot["args"] else {}
                except json.JSONDecodeError:
                    args = {}

                await emit("tool_call", {"id": slot["id"], "name": name, "args": args})
                result, node_ids = await invoke(name, args)
                if node_ids:
                    await emit("nodes_visited", {"ids": node_ids})
                await emit("tool_result", {"id": slot["id"], "name": name, "summary": _summarize(result)})

                messages.append({
                    "role": "tool",
                    "tool_call_id": slot["id"],
                    "content": json.dumps(result, default=str),
                })

        # Hit MAX_TOOL_LOOPS without finishing.
        await emit("error", {"message": f"hit tool-loop cap ({MAX_TOOL_LOOPS})"})
        await emit("done", {})
