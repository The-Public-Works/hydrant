"use client";

import dynamic from "next/dynamic";
import type { ForceGraphMethods } from "react-force-graph-2d";
import { useEffect, useMemo, useRef, useState } from "react";

import { subscribeNodesVisited } from "@/lib/graphBus";
import { GraphPayload } from "@/lib/types";

// react-force-graph-2d touches `window`; load only on the client.
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

const NODE_COLORS: Record<string, string> = {
  issue: "#fb7185",
  pr: "#c084fc",
  commit: "#fbbf24",
  comment: "#94a3b8",
  file: "#38bdf8",
  symbol: "#34d399",
  doc_chunk: "#a3e635",
  author: "#f472b6",
};

const HIGHLIGHT_MS = 2500;

type FGNode = {
  id: number;
  type: string;
  source_key: string;
  props: Record<string, unknown>;
  degree: number;
};

type FGLink = {
  source: number;
  target: number;
  type: string;
};

export function GraphPanel({ repo }: { repo: string | null }) {
  const [graph, setGraph] = useState<GraphPayload | null>(null);
  const [hover, setHover] = useState<FGNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const highlightedRef = useRef<Map<number, number>>(new Map());
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);
  const rafRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });

  // Resize observer so the canvas fills its container.
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (cr) setSize({ w: Math.floor(cr.width), h: Math.floor(cr.height) });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Fetch graph payload when repo changes.
  useEffect(() => {
    setGraph(null);
    setError(null);
    highlightedRef.current.clear();
    if (!repo) return;
    const ctrl = new AbortController();
    fetch(`/api/graph?repo=${encodeURIComponent(repo)}&limit=600`, {
      signal: ctrl.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json() as Promise<GraphPayload>;
      })
      .then(setGraph)
      .catch((e) => {
        if (ctrl.signal.aborted) return;
        setError(e instanceof Error ? e.message : String(e));
      });
    return () => ctrl.abort();
  }, [repo]);

  // Subscribe to nodes_visited events. After the initial force cooldown,
  // react-force-graph-2d pauses its render loop. We resume it on each event
  // (without reheating the layout — that would shuffle node positions) and
  // pause it again once all highlights have expired.
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const map = highlightedRef.current;
      for (const [id, at] of map) {
        if (now - at >= HIGHLIGHT_MS) map.delete(id);
      }
      if (map.size === 0) {
        rafRef.current = null;
        fgRef.current?.pauseAnimation();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    const unsub = subscribeNodesVisited((ids) => {
      const now = Date.now();
      for (const id of ids) highlightedRef.current.set(id, now);
      fgRef.current?.resumeAnimation();
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(tick);
      }
    });
    return () => {
      unsub();
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  const data = useMemo(() => {
    if (!graph) return { nodes: [], links: [] };
    const nodes: FGNode[] = graph.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      source_key: n.source_key,
      props: n.props,
      degree: n.degree,
    }));
    const ids = new Set(nodes.map((n) => n.id));
    const links: FGLink[] = graph.edges
      .filter((e) => ids.has(e.src) && ids.has(e.dst))
      .map((e) => ({ source: e.src, target: e.dst, type: e.type }));
    return { nodes, links };
  }, [graph]);

  if (!repo) {
    return (
      <div className="h-full flex items-center justify-center text-sm" style={{ color: "var(--muted)" }}>
        No repo selected.
      </div>
    );
  }
  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-sm p-4" style={{ color: "#fb7185" }}>
        Graph error: {error}
      </div>
    );
  }
  if (!graph) {
    return (
      <div className="h-full flex items-center justify-center text-sm" style={{ color: "var(--muted)" }}>
        Loading graph…
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <ForceGraph2D
        ref={fgRef}
        width={size.w}
        height={size.h}
        graphData={data}
        backgroundColor="#0b0d10"
        nodeRelSize={4}
        linkColor={() => "rgba(120,130,150,0.25)"}
        linkWidth={0.5}
        cooldownTicks={120}
        onNodeHover={(n) => setHover((n as FGNode | null) ?? null)}
        nodeCanvasObjectMode={() => "after"}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const n = node as FGNode & { x: number; y: number };
          const baseR = 3 + Math.min(8, Math.sqrt(n.degree));
          const color = NODE_COLORS[n.type] ?? "#94a3b8";

          // Highlight pulse if recently visited.
          const at = highlightedRef.current.get(n.id);
          if (at) {
            const age = Date.now() - at;
            if (age < HIGHLIGHT_MS) {
              const t = age / HIGHLIGHT_MS;
              const ringR = baseR + 4 + 14 * t;
              ctx.beginPath();
              ctx.arc(n.x, n.y, ringR, 0, 2 * Math.PI);
              ctx.strokeStyle = `rgba(56,189,248,${1 - t})`;
              ctx.lineWidth = 2 / globalScale;
              ctx.stroke();
            } else {
              highlightedRef.current.delete(n.id);
            }
          }

          ctx.beginPath();
          ctx.arc(n.x, n.y, baseR, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();

          // Labels for high-degree nodes only (otherwise too noisy).
          if (n.degree > 8 && globalScale > 1.2) {
            const label = shortLabel(n);
            ctx.font = `${10 / globalScale}px ui-sans-serif, system-ui`;
            ctx.fillStyle = "rgba(231,234,238,0.85)";
            ctx.fillText(label, n.x + baseR + 2, n.y + 3 / globalScale);
          }
        }}
      />
      <Legend />
      {hover && <HoverCard node={hover} />}
    </div>
  );
}

function shortLabel(n: FGNode): string {
  const props = n.props as Record<string, unknown>;
  if (n.type === "file" || n.type === "doc_chunk") {
    const p = (props.path ?? props.file_path) as string | undefined;
    return p ? p.split("/").slice(-1)[0] : n.source_key.split(":").slice(-1)[0];
  }
  if (n.type === "issue" || n.type === "pr") {
    return `#${props.number ?? ""}`;
  }
  if (n.type === "commit") {
    const sha = (props.sha as string | undefined) ?? "";
    return sha.slice(0, 7);
  }
  if (n.type === "symbol") return (props.name as string | undefined) ?? "";
  if (n.type === "author") return (props.login as string | undefined) ?? "";
  return n.type;
}

function Legend() {
  return (
    <div
      className="absolute top-2 left-2 text-xs rounded p-2 space-y-0.5"
      style={{
        background: "rgba(20,23,28,0.85)",
        border: "1px solid var(--border)",
        backdropFilter: "blur(4px)",
      }}
    >
      {Object.entries(NODE_COLORS).map(([type, color]) => (
        <div key={type} className="flex items-center gap-2">
          <span
            className="inline-block rounded-full"
            style={{ width: 8, height: 8, background: color }}
          />
          <span style={{ color: "var(--muted)" }}>{type}</span>
        </div>
      ))}
    </div>
  );
}

function HoverCard({ node }: { node: FGNode }) {
  const props = node.props as Record<string, unknown>;
  const title =
    (props.title as string | undefined) ??
    (props.path as string | undefined) ??
    (props.name as string | undefined) ??
    (props.sha as string | undefined) ??
    node.source_key;
  return (
    <div
      className="absolute bottom-2 right-2 max-w-[40%] text-xs rounded p-2"
      style={{
        background: "rgba(20,23,28,0.92)",
        border: "1px solid var(--border)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div className="font-medium mb-1" style={{ color: "var(--accent)" }}>
        {node.type} · degree {node.degree}
      </div>
      <div className="break-all" style={{ color: "var(--foreground)" }}>{title}</div>
    </div>
  );
}
