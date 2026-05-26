"use client";

import Link from "next/link";
import TeamBadge from "@/components/matches/TeamBadge";
import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import { cn } from "@/lib/utils";

function teamInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatEv(ev: number | null): string {
  if (ev == null) return "—";
  return `${(ev * 100).toFixed(1)}%`;
}

function formatOddsDistortion(edge: number | null): string {
  if (edge == null) return "—";
  const n = Number(edge);
  if (!Number.isFinite(n)) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function marketRegime(match: EnrichedLiveMatch): string {
  return (
    match.autonomousRegime ??
    match.opsGameState ??
    match.operationalState ??
    "NEUTRAL"
  );
}

function lastSignal(match: EnrichedLiveMatch): string {
  if (match.engineActiveSignal?.trim()) return match.engineActiveSignal.trim();
  if (match.evSignalType?.trim()) return match.evSignalType.trim();
  const top = match.markets?.[0];
  if (top?.market) return top.market;
  return "—";
}

function opsNarrative(match: EnrichedLiveMatch): string {
  const text =
    match.opsNarrative?.trim() ||
    match.opsHeadline?.trim() ||
    match.displayInsight?.trim() ||
    match.cardInsight?.trim();
  return text || "Sem narrativa operacional para este fixture.";
}

type LiveMatchTerminalCardProps = {
  match: EnrichedLiveMatch;
  /** Rótulo da fonte ao vivo (ex.: SportMonks) — vem do feed, não inventado no card. */
  dataSourceLabel?: string | null;
};

export default function LiveMatchTerminalCard({
  match,
  dataSourceLabel,
}: LiveMatchTerminalCardProps) {
  const highPressure = match.pressureScore >= 68;
  const scoreHome = match.scoreKnown ? String(match.homeScore ?? 0) : "—";
  const scoreAway = match.scoreKnown ? String(match.awayScore ?? 0) : "—";
  const sourceLabel = dataSourceLabel?.trim() || null;

  return (
    <article
      className={cn("gp-lmt-card", highPressure && "gp-lmt-card--hot")}
      data-fixture={match.fixtureId}
    >
      {/* Topo */}
      <header className="gp-lmt-card__top">
        <span className="gp-lmt-card__league" title={match.league}>
          {match.league}
          {match.round ? ` · ${match.round}` : ""}
        </span>
        <span className="gp-lmt-card__top-meta">
          {match.isLive ? (
            <span className="gp-lmt-card__live">LIVE</span>
          ) : (
            <span className="gp-lmt-card__status">{match.displayStatus ?? match.minuteLabel}</span>
          )}
          {sourceLabel ? (
            <>
              <span className="gp-lmt-card__sep" aria-hidden>
                ·
              </span>
              <span className="gp-lmt-card__source">{sourceLabel}</span>
            </>
          ) : null}
        </span>
      </header>

      {/* Centro — layout horizontal */}
      <div className="gp-lmt-card__scoreboard">
        <div className="gp-lmt-card__side gp-lmt-card__side--home">
          <TeamBadge teamName={match.homeTeam} logoUrl={match.homeLogo} size="md" />
          <div className="gp-lmt-card__team-text">
            <span className="gp-lmt-card__team-name" title={match.homeTeam}>
              {match.homeTeam}
            </span>
            <span className="gp-lmt-card__initials">{teamInitials(match.homeTeam)}</span>
          </div>
        </div>

        <div className="gp-lmt-card__center">
          <div className="gp-lmt-card__score" aria-label="Placar">
            <span className="gp-lmt-card__score-num">{scoreHome}</span>
            <span className="gp-lmt-card__score-dash">-</span>
            <span className="gp-lmt-card__score-num">{scoreAway}</span>
          </div>
          <p className="gp-lmt-card__minute">{match.minuteLabel}</p>
        </div>

        <div className="gp-lmt-card__side gp-lmt-card__side--away">
          <div className="gp-lmt-card__team-text gp-lmt-card__team-text--right">
            <span className="gp-lmt-card__team-name" title={match.awayTeam}>
              {match.awayTeam}
            </span>
            <span className="gp-lmt-card__initials">{teamInitials(match.awayTeam)}</span>
          </div>
          <TeamBadge teamName={match.awayTeam} logoUrl={match.awayLogo} size="md" />
        </div>
      </div>

      {/* Métricas */}
      <div className="gp-lmt-card__metrics">
        <MetricCell
          label="Pressure"
          value={String(Math.round(match.pressureScore))}
          highlight={highPressure}
        />
        <MetricCell label="EV" value={formatEv(match.ev)} />
        <MetricCell
          label="Momentum"
          value={`${match.momentum > 0 ? "+" : ""}${match.momentum.toFixed(1)}`}
        />
        <MetricCell label="Chaos" value={String(Math.round(match.chaosIndex))} />
        <MetricCell label="Odds Δ" value={formatOddsDistortion(match.edgePercent)} />
        <MetricCell label="Regime" value={marketRegime(match)} compact />
        <MetricCell
          label="Confidence"
          value={`${Math.round(match.confidence)}%`}
          className="gp-lmt-card__metric--wide"
        />
      </div>

      {/* Rodapé */}
      <footer className="gp-lmt-card__footer">
        <div className="gp-lmt-card__footer-copy">
          <p className="gp-lmt-card__narrative">{opsNarrative(match)}</p>
          <p className="gp-lmt-card__signal">
            <span className="gp-lmt-card__signal-label">Último sinal</span>
            <span className="gp-lmt-card__signal-value">{lastSignal(match)}</span>
          </p>
        </div>
        <Link href={`/match/${match.fixtureId}`} className="gp-lmt-card__cta">
          Abrir análise
        </Link>
      </footer>
    </article>
  );
}

function MetricCell({
  label,
  value,
  highlight,
  compact,
  className,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "gp-lmt-card__metric",
        compact && "gp-lmt-card__metric--compact",
        className
      )}
    >
      <span className="gp-lmt-card__metric-label">{label}</span>
      <span
        className={cn(
          "gp-lmt-card__metric-value",
          highlight && "gp-lmt-card__metric-value--accent"
        )}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}
