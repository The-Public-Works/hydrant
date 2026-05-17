"use client";

import { useEffect, useMemo, useState } from "react";

import { NodeBase, NodeDetail } from "@/lib/types";
import { NODE_COLORS } from "./GraphPanel";

export function NodeDetailPanel({
  nodeId,
  onSelectNode,
  onClose,
}: {
  nodeId: number | null;
  onSelectNode: (id: number) => void;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<NodeDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setDetail(null);
    setError(null);
    if (nodeId === null) return;
    const ctrl = new AbortController();
    setLoading(true);
    fetch(`/api/node/${nodeId}`, { signal: ctrl.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json() as Promise<NodeDetail>;
      })
      .then((d) => {
        setDetail(d);
        setLoading(false);
      })
      .catch((e) => {
        if (ctrl.signal.aborted) return;
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });
    return () => ctrl.abort();
  }, [nodeId]);

  const grouped = useMemo(() => {
    if (!detail) return [];
    const byId = new Map<number, NodeBase>();
    for (const n of detail.neighbors) byId.set(n.id, n);
    const buckets = new Map<string, { neighbor: NodeBase; direction: "out" | "in" }[]>();
    for (const e of detail.edges) {
      const isOut = e.src === detail.node.id;
      const otherId = isOut ? e.dst : e.src;
      if (otherId === detail.node.id) continue;
      const neighbor = byId.get(otherId);
      if (!neighbor) continue;
      const label = `${isOut ? "→" : "←"} ${e.type}`;
      const arr = buckets.get(label) ?? [];
      arr.push({ neighbor, direction: isOut ? "out" : "in" });
      buckets.set(label, arr);
    }
    return Array.from(buckets.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [detail]);

  if (nodeId === null) {
    return (
      <aside
        className="h-full p-3 text-sm flex items-center justify-center text-center"
        style={{ color: "var(--muted)", borderLeft: "1px solid var(--border)" }}
      >
        Click a node in the graph to inspect it.
      </aside>
    );
  }

  return (
    <aside
      className="h-full overflow-y-auto p-3 text-sm"
      style={{ borderLeft: "1px solid var(--border)", background: "var(--panel)" }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs" style={{ color: "var(--muted)" }}>node #{nodeId}</span>
        <button
          type="button"
          onClick={onClose}
          className="text-xs hover:underline"
          style={{ color: "var(--muted)" }}
        >
          close
        </button>
      </div>
      {loading && <div style={{ color: "var(--muted)" }}>Loading…</div>}
      {error && <div style={{ color: "#fb7185" }}>Error: {error}</div>}
      {detail && (
        <>
          <header className="mb-3">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="inline-block rounded-full"
                style={{
                  width: 9,
                  height: 9,
                  background: NODE_COLORS[detail.node.type] ?? "#94a3b8",
                }}
              />
              <span className="font-mono text-xs" style={{ color: "var(--accent)" }}>
                {detail.node.type}
              </span>
            </div>
            <div className="break-all" style={{ color: "var(--foreground)" }}>
              {nodeTitle(detail.node)}
            </div>
            <div className="text-xs mt-1 break-all" style={{ color: "var(--muted)" }}>
              {detail.node.source_key}
            </div>
          </header>

          <section className="mb-3">
            <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>props</div>
            <pre
              className="text-xs whitespace-pre-wrap break-all rounded p-2"
              style={{
                background: "var(--panel-2)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
                maxHeight: 240,
                overflow: "auto",
              }}
            >
              {JSON.stringify(detail.node.props, null, 2)}
            </pre>
          </section>

          <section>
            <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>
              neighbors ({detail.neighbors.length})
            </div>
            {grouped.length === 0 && (
              <div style={{ color: "var(--muted)" }}>No 1-hop neighbors.</div>
            )}
            {grouped.map(([label, items]) => (
              <div key={label} className="mb-2">
                <div className="text-xs font-mono" style={{ color: "var(--muted)" }}>{label}</div>
                <ul className="mt-1 space-y-0.5">
                  {items.map((it, i) => (
                    <li key={`${label}-${i}-${it.neighbor.id}`}>
                      <button
                        type="button"
                        onClick={() => onSelectNode(it.neighbor.id)}
                        className="text-left w-full text-xs rounded px-1.5 py-1 hover:underline flex items-center gap-2"
                        style={{ color: "var(--foreground)" }}
                      >
                        <span
                          className="inline-block rounded-full shrink-0"
                          style={{
                            width: 7,
                            height: 7,
                            background: NODE_COLORS[it.neighbor.type] ?? "#94a3b8",
                          }}
                        />
                        <span className="truncate">{nodeTitle(it.neighbor)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        </>
      )}
    </aside>
  );
}

function nodeTitle(n: NodeBase): string {
  const props = n.props;
  const candidates = ["title", "path", "name", "sha", "login"];
  for (const k of candidates) {
    const v = props[k];
    if (typeof v === "string" && v.length) {
      if (k === "sha") return v.slice(0, 12);
      return v;
    }
  }
  return n.source_key;
}
