"use client";

import { Grid3X3, List, Search } from "lucide-react";
import type { MatchCenterFilter } from "@/hooks/useLiveMatchCenter";

const FILTERS: { id: MatchCenterFilter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "live", label: "Ao vivo" },
  { id: "upcoming", label: "Próximos" },
  { id: "high_pressure", label: "Alta pressão" },
  { id: "ev_plus", label: "EV+" },
  { id: "execute", label: "EXECUTE" },
  { id: "favorites", label: "Favoritos" },
];

export default function MatchFilters({
  filter,
  onFilter,
  search,
  onSearch,
  viewMode,
  onViewMode,
  liveCount,
}: {
  filter: MatchCenterFilter;
  onFilter: (f: MatchCenterFilter) => void;
  search: string;
  onSearch: (q: string) => void;
  viewMode: "grid" | "list";
  onViewMode: (m: "grid" | "list") => void;
  liveCount: number;
}) {
  return (
    <div className="match-center-filters space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onFilter(f.id)}
            className={`h-9 rounded-lg border px-3.5 font-body text-sm transition-colors ${
              filter === f.id
                ? "border-[rgba(255,43,43,0.3)] bg-[rgba(255,43,43,0.08)] font-semibold text-[var(--text)]"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            {f.label}
            {f.id === "live" && liveCount > 0 && (
              <span className="ml-1.5 font-mono-data text-xs text-[#FF2B2B]">{liveCount}</span>
            )}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1 max-w-lg">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Buscar time ou liga…"
            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] py-0 pl-10 pr-3 font-body text-sm outline-none focus:border-[rgba(255,43,43,0.35)]"
          />
        </div>
        <div className="flex h-10 shrink-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1">
          <button
            type="button"
            onClick={() => onViewMode("grid")}
            className={`flex h-8 w-10 items-center justify-center rounded-md ${viewMode === "grid" ? "bg-[var(--gp-white-tech)] text-[var(--text)]" : "text-[var(--muted)]"}`}
            aria-label="Grade"
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onViewMode("list")}
            className={`flex h-8 w-10 items-center justify-center rounded-md ${viewMode === "list" ? "bg-[var(--gp-white-tech)] text-[var(--text)]" : "text-[var(--muted)]"}`}
            aria-label="Lista"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
