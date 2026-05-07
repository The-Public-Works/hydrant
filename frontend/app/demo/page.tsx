"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ChatPanel } from "../components/ChatPanel";
import { GraphPanel } from "../components/GraphPanel";
import { RepoSelector } from "../components/RepoSelector";
import { RepoSummary } from "@/lib/types";

export default function Demo() {
  const [repos, setRepos] = useState<RepoSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const counts = repos.find((r) => r.slug === selected)?.node_counts ?? {};
  const totalNodes = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col h-screen">
      <header
        className="flex items-center gap-4 px-4 py-2"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--panel)" }}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-xs hover:underline"
            style={{ color: "var(--muted)" }}
            title="Back to landing"
          >
            ← home
          </Link>
          <span className="font-mono text-sm font-semibold" style={{ color: "var(--accent)" }}>
            ctx-mcp
          </span>
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            knowledge graph + agent
          </span>
        </div>
        <div className="flex-1" />
        {error && <span className="text-xs" style={{ color: "#fb7185" }}>{error}</span>}
        {selected && (
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            {totalNodes.toLocaleString()} nodes ·{" "}
            {Object.entries(counts)
              .map(([t, n]) => `${n} ${t}`)
              .join(" · ")}
          </span>
        )}
        <RepoSelector repos={repos} value={selected} onChange={setSelected} />
      </header>

      <main className="flex-1 grid" style={{ gridTemplateColumns: "minmax(380px, 40%) 1fr" }}>
        <ChatPanel repo={selected} />
        <GraphPanel repo={selected} />
      </main>
    </div>
  );
}
