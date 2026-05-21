"use client";

import { motion } from "framer-motion";
import { useLiveMatchCenter } from "@/hooks/useLiveMatchCenter";
import MatchFilters from "@/components/matches/MatchFilters";
import TerminalHeader from "@/components/terminal/TerminalHeader";
import TerminalKpiStrip from "@/components/terminal/TerminalKpiStrip";
import LiveOperationsGrid from "@/components/live/LiveOperationsGrid";
import { terminalStagger } from "@/components/ui/terminal/motion";

export default function TerminalHome() {
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
      className="gp-terminal-home"
    >
      <TerminalHeader feedStatus={feedStatus} opsStatus={opsStatus} source={source} />

      <TerminalKpiStrip {...kpis} />

      <motion.div variants={{ show: { transition: { staggerChildren: 0.05 } } }}>
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

      <LiveOperationsGrid
        matches={matches}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
        viewMode={viewMode}
        isLoading={isLoading}
      />
    </motion.div>
  );
}
