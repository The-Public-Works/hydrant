"use client";

import { NODE_COLORS } from "./GraphPanel";

export function GraphFilters({
  typeFilter,
  onTypeFilterChange,
  searchQuery,
  onSearchQueryChange,
}: {
  typeFilter: Set<string>;
  onTypeFilterChange: (next: Set<string>) => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
}) {
  const types = Object.keys(NODE_COLORS);

  const toggle = (t: string) => {
    const next = new Set(typeFilter);
    if (next.has(t)) next.delete(t);
    else next.add(t);
    onTypeFilterChange(next);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchQueryChange(e.target.value)}
        placeholder="search nodes…"
        className="text-xs rounded px-2 py-1 outline-none w-44"
        style={{
          background: "var(--panel-2)",
          color: "var(--foreground)",
          border: "1px solid var(--border)",
        }}
      />
      <div className="flex items-center gap-1 flex-wrap">
        {types.map((t) => {
          const on = typeFilter.has(t);
          return (
            <button
              key={t}
              type="button"
              onClick={() => toggle(t)}
              className="text-xs rounded px-2 py-0.5 flex items-center gap-1.5"
              style={{
                background: on ? "var(--panel-2)" : "transparent",
                color: on ? "var(--foreground)" : "var(--muted)",
                border: "1px solid var(--border)",
                opacity: on ? 1 : 0.6,
              }}
              title={on ? `hide ${t}` : `show ${t}`}
            >
              <span
                className="inline-block rounded-full"
                style={{ width: 7, height: 7, background: NODE_COLORS[t] }}
              />
              {t}
            </button>
          );
        })}
      </div>
    </div>
  );
}
