"use client";

import { motion } from "framer-motion";
import { useLiveMatchCenter } from "@/hooks/useLiveMatchCenter";
import MatchFilters from "@/components/matches/MatchFilters";
import TerminalHeader from "@/components/terminal/TerminalHeader";
import TerminalKpiStrip from "@/components/terminal/TerminalKpiStrip";
import LiveOperationsGrid from "@/components/live/LiveOperationsGrid";
import TerminalRadarStrip from "@/components/terminal/TerminalRadarStrip";
import EdgeSpotlight from "@/components/terminal/EdgeSpotlight";
import LiveSignalFeed from "@/components/terminal/LiveSignalFeed";
import LiveSignalFeedMobile from "@/components/terminal/LiveSignalFeedMobile";
import TerminalTipsBanner from "@/components/terminal/TerminalTipsBanner";
import TerminalPremiumAmbient from "@/components/terminal/TerminalPremiumAmbient";
import { terminalStagger } from "@/components/ui/terminal/motion";
import TerminalAuditToggle from "@/components/terminal/TerminalAuditToggle";
import { useTerminalAuditMode } from "@/hooks/useTerminalAuditMode";

export default function TerminalHome() {
  const {
    matches,
    allMatches,
    liveSignals,
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
  const { auditMode, setAuditMode } = useTerminalAuditMode();

  return (
    <motion.div
      variants={terminalStagger}
      initial="hidden"
      animate="show"
      className="gp-terminal-v2 gp-terminal-v2--premium"
    >
      <TerminalPremiumAmbient />
      <div className="gp-terminal-v2__top-bar">
        <div className="gp-terminal-v2__top-main">
          <TerminalHeader feedStatus={feedStatus} opsStatus={opsStatus} source={source} />
          <LiveSignalFeedMobile signals={liveSignals} />
        </div>
        <LiveSignalFeed
          signals={liveSignals}
          className="gp-terminal-v2__signal-feed--desktop hidden lg:flex"
        />
      </div>

      <TerminalTipsBanner />

      <TerminalKpiStrip {...kpis} />

      <div className="gp-terminal-v2__desk">
        <aside className="gp-terminal-v2__rail">
          <TerminalRadarStrip matches={allMatches.length > 0 ? allMatches : matches} />
          <EdgeSpotlight matches={allMatches.length > 0 ? allMatches : matches} />
        </aside>

        <section className="gp-terminal-v2__main">
          <motion.div variants={{ show: { transition: { staggerChildren: 0.05 } } }}>
            <div className="gp-terminal-v2__filters-row">
              <MatchFilters
                filter={filter}
                onFilter={setFilter}
                search={search}
                onSearch={setSearch}
                viewMode={viewMode}
                onViewMode={setViewMode}
                liveCount={kpis.live}
                upcomingCount={kpis.upcoming}
              />
              <TerminalAuditToggle enabled={auditMode} onChange={setAuditMode} />
            </div>
          </motion.div>

          <LiveOperationsGrid
            matches={matches}
            allMatches={allMatches}
            filter={filter}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            viewMode={viewMode}
            isLoading={isLoading}
            liveCount={kpis.live}
            upcomingCount={kpis.upcoming}
            auditMode={auditMode}
          />
        </section>
      </div>
    </motion.div>
  );
}
