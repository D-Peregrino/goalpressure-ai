"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import type { TacticalProfile } from "@/lib/tactical/tacticalMatchReader";
import {
  getTacticalVisualTheme,
  resolveSideGlow,
  tacticalProfileClass,
} from "@/lib/match/matchStoryVisual";
import type { OffensiveControlSide } from "@/lib/tactical/tacticalMatchReader";

function MatchCardStoryAuraInner({
  profile,
  offensiveControl,
  homePressure,
  awayPressure,
  homeColor,
  awayColor,
  momentum,
}: {
  profile: TacticalProfile;
  offensiveControl: OffensiveControlSide;
  homePressure: number;
  awayPressure: number;
  homeColor: string;
  awayColor: string;
  momentum: number;
}) {
  const theme = getTacticalVisualTheme(profile);
  const glow = resolveSideGlow(theme, offensiveControl, homePressure, awayPressure);
  const pulseClass = theme.pulse !== "none" ? `gp-story-aura--pulse-${theme.pulse}` : "";

  return (
    <div
      className={`gp-story-aura ${tacticalProfileClass(profile)} ${pulseClass} gp-story-aura--mood-${theme.mood}`}
      aria-hidden
    >
      {theme.diagonal && <div className="gp-story-aura__diagonal" />}
      {theme.multiZone && (
        <>
          <span className="gp-story-aura__zone gp-story-aura__zone--1" />
          <span className="gp-story-aura__zone gp-story-aura__zone--2" />
          <span className="gp-story-aura__zone gp-story-aura__zone--3" />
        </>
      )}
      <div
        className="gp-story-aura__heat"
        style={{ background: theme.heatAccent }}
      />
      <motion.div
        className="gp-story-aura__home"
        style={{
          background: `radial-gradient(ellipse at 20% 50%, ${homeColor}${Math.round(glow.home * 99).toString(16).padStart(2, "0")} 0%, transparent 68%)`,
          opacity: glow.home,
        }}
        animate={
          theme.pulseSide === "home"
            ? { opacity: [glow.home * 0.6, glow.home, glow.home * 0.6] }
            : { opacity: glow.home }
        }
        transition={{ duration: theme.pulse === "fast" ? 1.2 : 2.4, repeat: Infinity }}
      />
      <motion.div
        className="gp-story-aura__away"
        style={{
          background: `radial-gradient(ellipse at 80% 50%, ${awayColor}${Math.round(glow.away * 99).toString(16).padStart(2, "0")} 0%, transparent 68%)`,
          opacity: glow.away,
        }}
        animate={
          theme.pulseSide === "away"
            ? { opacity: [glow.away * 0.6, glow.away, glow.away * 0.6] }
            : { opacity: glow.away }
        }
        transition={{ duration: theme.pulse === "fast" ? 1.1 : 2.2, repeat: Infinity }}
      />
      <motion.div
        className="gp-story-aura__momentum"
        animate={{ scaleX: [0.35, 0.55 + momentum / 200, 0.35] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

export default memo(MatchCardStoryAuraInner);
