"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { GraphFilters } from "../components/GraphFilters";
import { GraphPanel, NODE_COLORS } from "../components/GraphPanel";
import { NodeDetailPanel } from "../components/NodeDetailPanel";
import { RepoSelector } from "../components/RepoSelector";
import { RepoSummary } from "@/lib/types";

export default function GraphExplorer() {
  const [repos, setRepos] = useState<RepoSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState<Set<string>>(
    () => new Set(Object.keys(NODE_COLORS)),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [displayedCount, setDisplayedCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/repos")
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json() as Promise<{ repos: RepoSummary[] }>;
      })
      .then((d) => {
        setRepos(d.repos);
        if (d.repos.length) setSelected(d.repos[0].slug);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  // Clear node selection and displayed-count when switching repos.
  useEffect(() => {
    setSelectedNodeId(null);
    setDisplayedCount(null);
  }, [selected]);

  const counts = useMemo(
    () => repos.find((r) => r.slug === selected)?.node_counts ?? {},
    [repos, selected],
  );
  const totalNodes = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col h-screen">
      <header
        className="flex items-center gap-3 px-4 py-2 flex-wrap"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--panel)" }}
      >
        <Link
          href="/"
          className="text-xs hover:underline"
          style={{ color: "var(--muted)" }}
          title="Back to landing"
        >
          ← home
        </Link>
        <span className="font-mono text-sm font-semibold" style={{ color: "var(--accent)" }}>
          hydrant
        </span>
        <span className="text-xs" style={{ color: "var(--muted)" }}>
          graph explorer
        </span>
        <RepoSelector repos={repos} value={selected} onChange={setSelected} />
        {selected && (
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            showing {(displayedCount ?? 0).toLocaleString()} of{" "}
            {totalNodes.toLocaleString()} nodes
          </span>
        )}
        <div className="flex-1" />
        <GraphFilters
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
        />
        {error && <span className="text-xs" style={{ color: "#fb7185" }}>{error}</span>}
      </header>

      <main
        className="flex-1 grid"
        style={{
          gridTemplateColumns: selectedNodeId === null ? "1fr 320px" : "1fr 380px",
        }}
      >
        <GraphPanel
          repo={selected}
          onNodeClick={setSelectedNodeId}
          selectedId={selectedNodeId}
          typeFilter={typeFilter}
          searchQuery={searchQuery}
          onLoaded={({ nodes }) => setDisplayedCount(nodes)}
        />
        <NodeDetailPanel
          nodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          onClose={() => setSelectedNodeId(null)}
        />
      </main>
    </div>
  );
}
