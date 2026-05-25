"use client";

import { motion } from "framer-motion";
import { BRAND } from "@/lib/design/brand";
import { TERMINAL_COPY } from "@/lib/ux/sportsLanguage";
import DataSourceBadge from "@/components/ui/DataSourceBadge";
import StatusBadge from "@/components/ui/terminal/StatusBadge";
import type { ActiveDataSource } from "@/lib/data-source/config";
import { terminalFadeUp } from "@/components/ui/terminal/motion";

export default function TerminalHeader({
  feedStatus,
  opsStatus,
  source,
  dataSourceBadge,
  feedError,
}: {
  feedStatus: "live" | "loading" | "stale" | "error" | "empty";
  opsStatus: "live" | "loading" | "error";
  source: ActiveDataSource | string;
  dataSourceBadge?: string | null;
  feedError?: string | null;
}) {
  return (
    <motion.header
      variants={terminalFadeUp}
      className="gp-terminal-header gp-terminal-header--sport gp-terminal-header--premium"
    >
      <div className="gp-terminal-header__copy">
        <p className="gp-type-label gp-terminal-header__eyebrow">
          <span className="gp-terminal-header__live-dot" aria-hidden />
          {TERMINAL_COPY.title}
        </p>
        <h1 className="gp-type-display gp-terminal-header__title">{BRAND.tagline}</h1>
        <p className="gp-type-body gp-terminal-header__subtitle">
          {TERMINAL_COPY.subtitle}
        </p>
      </div>
      <div className="gp-terminal-header__status">
        <StatusBadge
          status={
            feedStatus === "live"
              ? "LIVE"
              : feedStatus === "loading"
                ? "SYNC"
                : "DEGRADED"
          }
          pulse={feedStatus === "live"}
        />
        <StatusBadge
          status={
            opsStatus === "live"
              ? "ONLINE"
              : opsStatus === "loading"
                ? "SYNC"
                : "DEGRADED"
          }
        />
        <DataSourceBadge
          source={(source as ActiveDataSource) || "none"}
          error={feedError}
        />
        {dataSourceBadge && source === "sportmonks" && (
          <span className="gp-type-caption gp-status-chip gp-status-chip--quiet">
            {dataSourceBadge}
          </span>
        )}
      </div>
    </motion.header>
  );
}
