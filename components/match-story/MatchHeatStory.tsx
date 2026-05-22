"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import type { TacticalProfile } from "@/lib/tactical/tacticalMatchReader";
import type { OffensiveControlSide } from "@/lib/tactical/tacticalMatchReader";
import { getTacticalVisualTheme } from "@/lib/match/matchStoryVisual";

function intensityFeel(score: number): string {
  if (score >= 75) return "Explodindo";
  if (score >= 55) return "Quente";
  if (score >= 35) return "Vivo";
  return "Morno";
}

function MatchHeatStoryInner({
  profile,
  homeTeam,
  awayTeam,
  homePressure,
  awayPressure,
  momentum,
  tacticalIntensity,
  offensiveControl,
  compact = false,
}: {
  profile: TacticalProfile;
  homeTeam: string;
  awayTeam: string;
  homePressure: number;
  awayPressure: number;
  momentum: number;
  tacticalIntensity: number;
  offensiveControl: OffensiveControlSide;
  compact?: boolean;
}) {
  const theme = getTacticalVisualTheme(profile);
  const homePct = Math.min(100, Math.max(4, homePressure));
  const awayPct = Math.min(100, Math.max(4, awayPressure));
  const homeShort = homeTeam.split(" ").slice(-1)[0] ?? homeTeam;
  const awayShort = awayTeam.split(" ").slice(-1)[0] ?? awayTeam;
  const dimHome = theme.dimSide === "home";
  const dimAway = theme.dimSide === "away";

  return (
    <div className={`gp-heat-story ${compact ? "gp-heat-story--compact" : ""}`}>
      <div className="gp-heat-story__zones">
        <div
          className={`gp-heat-story__side ${dimHome ? "gp-heat-story__side--dim" : ""} ${offensiveControl === "HOME" ? "gp-heat-story__side--lead" : ""}`}
        >
          <span className="gp-heat-story__name">{homeShort}</span>
          <div className="gp-heat-story__bar">
            <motion.span
              className="gp-heat-story__fill gp-heat-story__fill--home"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: homePct / 100 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              style={{ transformOrigin: "left center" }}
            />
          </div>
        </div>
        <div
          className={`gp-heat-story__side gp-heat-story__side--away ${dimAway ? "gp-heat-story__side--dim" : ""} ${offensiveControl === "AWAY" ? "gp-heat-story__side--lead" : ""}`}
        >
          <span className="gp-heat-story__name">{awayShort}</span>
          <div className="gp-heat-story__bar">
            <motion.span
              className="gp-heat-story__fill gp-heat-story__fill--away"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: awayPct / 100 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              style={{ transformOrigin: "right center" }}
            />
          </div>
        </div>
      </div>

      <div className="gp-heat-story__pulse-row">
        <span className="gp-heat-story__pulse-label">Ritmo</span>
        <div className="gp-heat-story__pulse-track">
          <motion.span
            className="gp-heat-story__pulse-dot"
            animate={{ left: `${Math.min(96, momentum)}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 18 }}
          />
        </div>
        <span className="gp-heat-story__feel">{intensityFeel(tacticalIntensity)}</span>
      </div>
    </div>
  );
}

export default memo(MatchHeatStoryInner);
