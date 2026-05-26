"use client";

import Link from "next/link";
import TeamBadge from "@/components/matches/TeamBadge";
import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import {
  formatPercentDisplay,
  formatSignedDisplay,
  humanizeSignalLabel,
  roundDisplay,
  translateRegimeLabel,
} from "@/lib/terminal/formatDisplay";
import { cn } from "@/lib/utils";

type LiveMatchTerminalCardProps = {
  match: EnrichedLiveMatch;
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
      <header className="gp-lmt-card__top">
        <span className="gp-lmt-card__league" title={match.league}>
          {match.league}
          {match.round ? ` · ${match.round}` : ""}
        </span>
        <span className="gp-lmt-card__top-meta">
          {match.isLive ? (
            <span className="gp-lmt-card__live">AO VIVO</span>
          ) : (
            <span>{match.minuteLabel}</span>
          )}
          {sourceLabel ? (
            <>
              <span aria-hidden>·</span>
              <span className="gp-lmt-card__source">{sourceLabel}</span>
            </>
          ) : null}
        </span>
      </header>

      <div className="gp-lmt-card__scoreboard">
        <div className="gp-lmt-card__side">
          <TeamBadge teamName={match.homeTeam} logoUrl={match.homeLogo} size="md" />
          <div>
            <span className="gp-lmt-card__team-name" title={match.homeTeam}>
              {match.homeTeam}
            </span>
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
          <div className="gp-lmt-card__team-text--right">
            <span className="gp-lmt-card__team-name" title={match.awayTeam}>
              {match.awayTeam}
            </span>
          </div>
          <TeamBadge teamName={match.awayTeam} logoUrl={match.awayLogo} size="md" />
        </div>
      </div>

      <div className="gp-lmt-card__metrics">
        <MetricCell
          label="Pressão"
          value={roundDisplay(match.pressureScore)}
          highlight={highPressure}
        />
        <MetricCell label="Valor (EV)" value={formatPercentDisplay(match.ev)} />
        <MetricCell label="Momento ofensivo" value={formatSignedDisplay(match.momentum)} />
        <MetricCell label="Caos" value={roundDisplay(match.chaosIndex)} />
        <MetricCell label="Distorção odd" value={formatPercentDisplay(match.edgePercent)} />
        <MetricCell label="Regime" value={translateRegimeLabel(marketRegimeRaw(match))} />
        <MetricCell
          label="Confiança"
          value={`${roundDisplay(match.confidence)}%`}
          className="gp-lmt-card__metric--wide"
        />
      </div>

      <footer className="gp-lmt-card__footer">
        <div className="gp-lmt-card__footer-copy">
          <p className="gp-lmt-card__narrative">{opsNarrative(match)}</p>
          <p className="gp-lmt-card__signal mt-2">
            <span className="gp-lmt-card__signal-label">Último sinal · </span>
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

function marketRegimeRaw(match: EnrichedLiveMatch): string {
  return match.autonomousRegime ?? match.opsGameState ?? match.operationalState ?? "NEUTRAL";
}

function lastSignal(match: EnrichedLiveMatch): string {
  if (match.engineActiveSignal?.trim()) return humanizeSignalLabel(match.engineActiveSignal);
  if (match.evSignalType?.trim()) return humanizeSignalLabel(match.evSignalType);
  const top = match.markets?.[0];
  if (top?.market) return humanizeSignalLabel(top.market);
  return "—";
}

function opsNarrative(match: EnrichedLiveMatch): string {
  const text =
    match.opsNarrative?.trim() ||
    match.opsHeadline?.trim() ||
    match.displayInsight?.trim() ||
    match.cardInsight?.trim();
  return text || "Aguardando leitura operacional para este jogo.";
}

function MetricCell({
  label,
  value,
  highlight,
  className,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("gp-lmt-card__metric", className)}>
      <span className="gp-lmt-card__metric-label">{label}</span>
      <span
        className={cn("gp-lmt-card__metric-value", highlight && "gp-lmt-card__metric-value--accent")}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}
