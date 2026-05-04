"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { sseFetch } from "@/lib/sse";
import { emitNodesVisited } from "@/lib/graphBus";
import { ChatMessage, ToolCallChip } from "@/lib/types";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function ChatPanel({ repo }: { repo: string | null }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const send = useCallback(async () => {
    const q = input.trim();
    if (!q || busy) return;
    setInput("");

    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      text: q,
      toolCalls: [],
      done: true,
    };
    const assistantMsg: ChatMessage = {
      id: uid(),
      role: "assistant",
      text: "",
      toolCalls: [],
      done: false,
    };
    // Capture history *before* this turn for the API request.
    const historyForApi = messages
      .filter((m) => m.done)
      .map((m) => ({ role: m.role, content: m.text }));

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setBusy(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const params = new URLSearchParams({
      q,
      history: JSON.stringify(historyForApi),
    });
    if (repo) params.set("repo", repo);

    try {
      // Bypass Next dev's rewrite proxy for SSE — it buffers text/event-stream.
      // CORS on the backend permits localhost:3000 (api/app.py).
      const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8765";
      for await (const ev of sseFetch(`${apiBase}/api/chat?${params.toString()}`, ctrl.signal)) {
        let parsed: Record<string, unknown> = {};
        try {
          parsed = JSON.parse(ev.data);
        } catch {
          continue;
        }

        if (ev.event === "text_delta") {
          const delta = String(parsed.delta ?? "");
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id ? { ...m, text: m.text + delta } : m,
            ),
          );
        } else if (ev.event === "tool_call") {
          const chip: ToolCallChip = {
            id: String(parsed.id ?? uid()),
            name: String(parsed.name ?? "tool"),
            args: (parsed.args as Record<string, unknown>) ?? {},
          };
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id
                ? { ...m, toolCalls: [...m.toolCalls, chip] }
                : m,
            ),
          );
        } else if (ev.event === "tool_result") {
          const id = String(parsed.id ?? "");
          const summary = String(parsed.summary ?? "");
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id
                ? {
                    ...m,
                    toolCalls: m.toolCalls.map((c) =>
                      c.id === id ? { ...c, summary } : c,
                    ),
                  }
                : m,
            ),
          );
        } else if (ev.event === "nodes_visited") {
          const ids = (parsed.ids as number[]) ?? [];
          if (ids.length) emitNodesVisited(ids);
        } else if (ev.event === "error") {
          const msg = String(parsed.message ?? "unknown error");
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id
                ? { ...m, text: m.text + `\n\n[error] ${msg}` }
                : m,
            ),
          );
        } else if (ev.event === "done") {
          break;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsg.id
            ? { ...m, text: m.text + `\n\n[stream error] ${msg}` }
            : m,
        ),
      );
    } finally {
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantMsg.id ? { ...m, done: true } : m)),
      );
      setBusy(false);
      abortRef.current = null;
    }
  }, [input, busy, messages, repo]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ borderRight: "1px solid var(--border)" }}>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.length === 0 && (
          <div className="text-sm" style={{ color: "var(--muted)" }}>
            <p className="mb-2">Try:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>List the indexed repos.</li>
              <li>Investigate issue #500 in sqlite-utils.</li>
              <li>Find code related to &ldquo;CSV import bugs&rdquo;.</li>
            </ul>
          </div>
        )}
        {messages.map((m) => (
          <Message key={m.id} m={m} />
        ))}
      </div>

      <div className="p-3" style={{ borderTop: "1px solid var(--border)" }}>
        <div className="flex gap-2 items-end">
          <textarea
            className="flex-1 resize-none rounded p-2 text-sm outline-none"
            style={{
              background: "var(--panel-2)",
              color: "var(--foreground)",
              border: "1px solid var(--border)",
              minHeight: 60,
              maxHeight: 200,
            }}
            placeholder="Ask the agent..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={busy}
          />
          <button
            onClick={send}
            disabled={busy || !input.trim()}
            className="rounded px-3 py-2 text-sm font-medium disabled:opacity-50"
            style={{
              background: "var(--accent-strong)",
              color: "#0b0d10",
            }}
          >
            {busy ? "…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Message({ m }: { m: ChatMessage }) {
  const isUser = m.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className="max-w-[90%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap"
        style={{
          background: isUser ? "var(--accent-strong)" : "var(--panel)",
          color: isUser ? "#0b0d10" : "var(--foreground)",
          border: isUser ? "none" : "1px solid var(--border)",
        }}
      >
        {m.toolCalls.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {m.toolCalls.map((c) => (
              <span
                key={c.id}
                className="text-xs rounded px-2 py-0.5 font-mono"
                style={{
                  background: "var(--panel-2)",
                  color: "var(--accent)",
                  border: "1px solid var(--border)",
                }}
                title={JSON.stringify(c.args, null, 2)}
              >
                {c.name}({argsPreview(c.args)})
              </span>
            ))}
          </div>
        )}
        {m.text || (!m.done && <span style={{ color: "var(--muted)" }}>thinking…</span>)}
      </div>
    </div>
  );
}

function argsPreview(args: Record<string, unknown>): string {
  const entries = Object.entries(args);
  if (!entries.length) return "";
  const formatted = entries
    .slice(0, 2)
    .map(([k, v]) => {
      const s = typeof v === "string" ? `"${v.length > 30 ? v.slice(0, 27) + "…" : v}"` : JSON.stringify(v);
      return `${k}=${s}`;
    });
  return formatted.join(", ") + (entries.length > 2 ? ", …" : "");
}
