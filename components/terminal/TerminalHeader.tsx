"use client";

import { motion } from "framer-motion";
import { BRAND } from "@/lib/design/brand";
import StatusBadge from "@/components/ui/terminal/StatusBadge";
import { terminalFadeUp } from "@/components/ui/terminal/motion";

export default function TerminalHeader({
  feedStatus,
  opsStatus,
  source,
}: {
  feedStatus: "live" | "loading" | "stale" | "error";
  opsStatus: "live" | "loading" | "error";
  source: string;
}) {
  return (
    <motion.header variants={terminalFadeUp} className="gp-terminal-header">
      <div className="gp-terminal-header__copy">
        <p className="gp-terminal-header__eyebrow">
          <span className="gp-terminal-header__live-dot" aria-hidden />
          Central operacional · {BRAND.domain}
        </p>
        <h1 className="gp-terminal-header__title">Live Operations Terminal</h1>
        <p className="gp-terminal-header__subtitle">{BRAND.subtitle}</p>
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
        <span className="gp-status-chip">Fonte · {source}</span>
      </div>
    </motion.header>
  );
}
