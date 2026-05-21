"use client";

import { Flame, Swords, Target } from "lucide-react";
import { getPressureTier, PRESSURE_STYLES } from "@/lib/pressureUtils";
import type { LiveMatchView } from "@/types/domain";
import PressureRadar from "@/components/PressureRadar";

export type LiveGameCardProps = LiveMatchView;

const TIER_LABEL: Record<string, string> = {
  low: "TIER-Y",
  medium: "TIER-O",
  high: "TIER-R",
};

export default function LiveGameCard({
  league,
  homeTeam,
  awayTeam,
  minute,
  pressureScore,
  shots,
  dangerousAttacks,
}: LiveGameCardProps) {
  const score = Math.min(100, Math.max(0, pressureScore));
  const tier = getPressureTier(score);
  const styles = PRESSURE_STYLES[tier];
  const matchLabel = `${homeTeam} vs ${awayTeam}`;
  const isHigh = tier === "high";

  return (
    <article
      className={`module-panel corner-brackets corner-brackets-inner group relative overflow-hidden transition-all duration-500 scanline-overlay ${
        isHigh ? "glow-red-strong" : ""
      } ${styles.cardHover}`}
    >
      {isHigh && (
        <div
          className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-30 blur-3xl"
          style={{ backgroundColor: styles.radarGlow }}
        />
      )}

      <div className="relative z-10 p-4">
        <div className="flex items-start justify-between gap-2 border-b border-card/60 pb-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[8px] font-semibold uppercase tracking-[0.28em] text-muted">
                {league}
              </span>
              <span className="font-mono text-[8px] uppercase tracking-widest text-muted/60">
                {TIER_LABEL[tier]}
              </span>
              <span className="flex items-center gap-1 border border-card/80 bg-card/50 px-1.5 py-px font-mono text-[8px] font-bold uppercase tracking-wider text-muted">
                <span
                  className={`h-1 w-1 rounded-full animate-live-blink ${styles.liveDot}`}
                />
                Live
              </span>
            </div>
            <h3 className="mt-2 truncate font-mono text-sm font-bold uppercase tracking-wide text-foreground">
              {matchLabel}
            </h3>
          </div>
          <div className="text-right">
            <p className="font-mono text-[8px] uppercase tracking-widest text-muted">
              Match Clock
            </p>
            <p className="font-mono text-lg font-bold tabular-nums text-foreground">
              {minute}&apos;
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <PressureRadar score={score} size={80} />
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[8px] uppercase tracking-[0.25em] text-muted">
              Pressure Index
            </p>
            <p
              className={`font-mono text-4xl font-bold leading-none tabular-nums transition-colors duration-500 ${styles.scoreText}`}
            >
              {score}
            </p>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-muted">
              / 100 scale
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex justify-between">
            <span className="flex items-center gap-1 font-mono text-[8px] uppercase tracking-widest text-muted">
              <Flame className={`h-3 w-3 ${styles.iconColor}`} />
              Offensive Load
            </span>
            <span
              className={`font-mono text-[10px] font-bold tabular-nums ${styles.scoreText}`}
            >
              {score}%
            </span>
          </div>
          <div className="relative h-2 overflow-hidden bg-card">
            <div
              className={`relative h-full transition-all duration-700 ease-out ${styles.barGradient} ${styles.barGlow}`}
              style={{ width: `${score}%` }}
            >
              <span className="bar-shimmer absolute inset-0" />
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-px bg-card/60">
          <StatBlock icon={Target} label="Shots" value={shots} />
          <StatBlock icon={Swords} label="Danger Attacks" value={dangerousAttacks} />
        </div>
      </div>
    </article>
  );
}

function StatBlock({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Target;
  label: string;
  value: number;
}) {
  return (
    <div className="bg-surface/90 px-3 py-2.5">
      <p className="flex items-center gap-1 font-mono text-[8px] uppercase tracking-widest text-muted">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <p className="mt-1 font-mono text-xl font-bold tabular-nums text-foreground transition-all duration-500">
        {value}
      </p>
    </div>
  );
}
