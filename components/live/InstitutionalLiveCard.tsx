"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Star } from "lucide-react";
import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import TeamBadge from "@/components/matches/TeamBadge";
import MetricSparkline from "@/components/charts/MetricSparkline";
import ExecutionPriorityBadge from "@/components/execution/ExecutionPriorityBadge";
import TriggerWindowChip from "@/components/execution/TriggerWindowChip";
import OddsMovementChip from "@/components/execution/OddsMovementChip";

function formatMetric(
  key: string,
  value: number | null | undefined
): string {
  if (value == null || Number.isNaN(Number(value))) return "—";
  if (key === "edgePercent") return `${Number(value).toFixed(1)}%`;
  if (key === "ev") return `${(Number(value) * 100).toFixed(1)}%`;
  return String(Math.round(Number(value)));
}

const METRICS: { key: keyof EnrichedLiveMatch; label: string; accent?: boolean }[] = [
  { key: "momentum", label: "Momentum" },
  { key: "pressureScore", label: "Pressure", accent: true },
  { key: "chaosIndex", label: "Chaos" },
  { key: "edgePercent", label: "Edge" },
  { key: "confidence", label: "Conf." },
  { key: "ev", label: "EV", accent: true },
];

export default function InstitutionalLiveCard({
  match,
  isFavorite,
  onToggleFavorite,
  pressureHistory,
  layout = "grid",
}: {
  match: EnrichedLiveMatch;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  pressureHistory?: number[];
  layout?: "grid" | "list";
}) {
  const isLive = match.displayStatus === "LIVE" || match.displayStatus === "HT";
  const scoreDisplay = match.scoreKnown
    ? `${match.homeScore ?? 0} : ${match.awayScore ?? 0}`
    : "— : —";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={`gp-live-card ${isLive ? "gp-live-card--live" : ""} ${layout === "list" ? "gp-live-card--list" : ""}`}
    >
      <header className="gp-live-card__header">
        <div className="min-w-0 flex-1">
          <p className="gp-live-card__league">{match.league}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`gp-live-pill ${isLive ? "gp-live-pill--active" : ""}`}
            >
              {isLive && <span className="gp-live-pill__dot" aria-hidden />}
              {match.displayStatus}
            </span>
            {isLive && (
              <span className="gp-minute-pulse font-mono-data tabular-nums">
                {match.minuteLabel}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onToggleFavorite();
            }}
            className="gp-icon-btn"
            aria-label={isFavorite ? "Remover favorito" : "Favoritar"}
          >
            <Star
              className={`h-4 w-4 ${isFavorite ? "fill-[var(--gp-red)] text-[var(--gp-red)]" : ""}`}
            />
          </button>
          <Link
            href={`/match/${encodeURIComponent(match.fixtureId)}`}
            className="gp-icon-btn"
            aria-label="Abrir partida"
          >
            <ChevronRight className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <div className="gp-live-card__scoreboard">
        <div className="gp-live-card__team gp-live-card__team--home">
          <TeamBadge teamName={match.homeTeam} logoUrl={match.homeLogo} size="lg" />
          <p className="gp-live-card__team-name">{match.homeTeam}</p>
        </div>
        <div className="gp-live-card__score-center">
          <p className="gp-live-card__score">{scoreDisplay}</p>
        </div>
        <div className="gp-live-card__team gp-live-card__team--away">
          <TeamBadge teamName={match.awayTeam} logoUrl={match.awayLogo} size="lg" />
          <p className="gp-live-card__team-name">{match.awayTeam}</p>
        </div>
      </div>

      <div className="gp-live-card__metrics">
        {METRICS.map(({ key, label, accent }) => (
          <div key={key} className="gp-metric-tile">
            <span className="gp-metric-tile__label">{label}</span>
            <span
              className={`gp-metric-tile__value ${accent ? "gp-metric-tile__value--accent" : ""}`}
            >
              {formatMetric(key, match[key] as number | null)}
            </span>
          </div>
        ))}
      </div>

      <div className="gp-live-card__execution-row">
        <TriggerWindowChip window={match.triggerWindow} />
        <ExecutionPriorityBadge
          decision={match.executionDecision}
          grade={match.executionGrade}
        />
        <OddsMovementChip
          primaryOdd={match.odds.primary}
          edgePercent={match.edgePercent}
        />
      </div>

      <MetricSparkline
        points={pressureHistory}
        label="Pressure timeline"
        height={44}
      />

      {match.recentEvents.length > 0 && (
        <div className="gp-live-card__events">
          {match.recentEvents.map((ev) => (
            <span key={ev} className="gp-event-tag">
              {ev}
            </span>
          ))}
        </div>
      )}
    </motion.article>
  );
}
