"use client";

import { RepoSummary } from "@/lib/types";

export function RepoSelector({
  repos,
  value,
  onChange,
}: {
  repos: RepoSummary[];
  value: string | null;
  onChange: (slug: string) => void;
}) {
  if (!repos.length) {
    return <span className="text-sm" style={{ color: "var(--muted)" }}>no repos indexed</span>;
  }
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="text-sm rounded px-2 py-1 outline-none"
      style={{
        background: "var(--panel-2)",
        color: "var(--foreground)",
        border: "1px solid var(--border)",
      }}
    >
      {repos.map((r) => (
        <option key={r.slug} value={r.slug}>
          {r.slug}
        </option>
      ))}
    </select>
  );
}
