"use client";

import { motion } from "framer-motion";
import { useLiveMatchCenter } from "@/hooks/useLiveMatchCenter";
import { BRAND } from "@/lib/design/brand";
import MatchFilters from "@/components/matches/MatchFilters";
import LiveMatchGrid from "@/components/matches/LiveMatchGrid";
import StatusBadge from "@/components/ui/terminal/StatusBadge";
import { terminalFadeUp, terminalStagger } from "@/components/ui/terminal/motion";

function KpiStrip({
  tracked,
  live,
  signals,
  avgEdge,
  confidence,
  execute,
}: {
  tracked: number;
  live: number;
  signals: number;
  avgEdge: number;
  confidence: number;
  execute: number;
}) {
  const items = [
    { label: "Rastreadas", value: String(tracked) },
    { label: "Ao vivo", value: String(live), accent: true },
    { label: "Sinais", value: String(signals) },
    { label: "Edge médio", value: `${avgEdge.toFixed(1)}%` },
    { label: "Confiança", value: String(Math.round(confidence)) },
    { label: "EXECUTE", value: String(execute), accent: true },
  ];

  return (
    <div className="app-shell__metrics-grid">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-[0_1px_4px_rgba(32,38,46,0.04)]"
        >
          <p className="font-mono-data text-[10px] uppercase tracking-wide text-[var(--muted)]">
            {item.label}
          </p>
          <p
            className={`mt-1 font-display text-2xl tabular-nums ${item.accent ? "text-[#FF2B2B]" : "text-[var(--text)]"}`}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function LiveMatchCenter() {
  const {
    matches,
    kpis,
    filter,
    setFilter,
    search,
    setSearch,
    viewMode,
    setViewMode,
    favorites,
    toggleFavorite,
    feedStatus,
    opsStatus,
    source,
    isLoading,
  } = useLiveMatchCenter();

  return (
    <motion.div
      variants={terminalStagger}
      initial="hidden"
      animate="show"
      className="w-full min-w-0 max-w-full space-y-8"
    >
      <motion.header variants={terminalFadeUp} className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="t-label flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FF2B2B] t-live-pulse" />
              {BRAND.domain}
            </p>
            <h1 className="t-page-title mt-2">Live Match Center Quantitativo</h1>
            <p className="mt-2 max-w-2xl font-body text-sm text-[var(--muted)]">
              {BRAND.subtitle}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge
              status={feedStatus === "live" ? "LIVE" : feedStatus === "loading" ? "SYNC" : "DEGRADED"}
              pulse={feedStatus === "live"}
            />
            <StatusBadge status={opsStatus === "live" ? "ONLINE" : "DEGRADED"} />
            <span className="t-status-chip">Fonte · {source}</span>
          </div>
        </div>
      </motion.header>

      <motion.div variants={terminalFadeUp}>
        <KpiStrip {...kpis} />
      </motion.div>

      <motion.div variants={terminalFadeUp}>
        <MatchFilters
          filter={filter}
          onFilter={setFilter}
          search={search}
          onSearch={setSearch}
          viewMode={viewMode}
          onViewMode={setViewMode}
          liveCount={kpis.live}
        />
      </motion.div>

      <motion.div variants={terminalFadeUp} className="min-w-0">
        <LiveMatchGrid
          matches={matches}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          viewMode={viewMode}
          isLoading={isLoading}
        />
      </motion.div>
    </motion.div>
  );
}
