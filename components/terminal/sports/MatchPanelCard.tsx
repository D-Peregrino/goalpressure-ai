"use client";

import { useMemo } from "react";
import {
  Activity,
  Crosshair,
  Flag,
  Gauge,
  Maximize2,
  Minimize2,
  Shield,
  Star,
  Target,
  X,
  Zap,
} from "lucide-react";
import TeamBadge from "@/components/matches/TeamBadge";
import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import {
  buildMatchMetricBoxes,
  footerMetrics,
  leagueLine,
  type TimelineWindow,
} from "@/lib/terminal/sportsDisplay";
import {
  evaluateMatchContext,
  type MatchContextResult,
} from "@/components/terminal/intelligence/ContextEngine";
import type { MatchTabId } from "./LiveMatchTabs";
import MetricIconBox from "./MetricIconBox";
import LiveTacticalField from "@/components/terminal/field/LiveTacticalField";
import OperationalDecisionPanel from "@/components/terminal/decision/OperationalDecisionPanel";
import SmartPressureTimeline from "@/components/terminal/timeline/SmartPressureTimeline";
import { mapOperationalDecision } from "@/components/terminal/decision/decisionMapper";
import GPIHero from "@/components/terminal/gpi/GPIHero";
import LeagueFlag from "./LeagueFlag";
import { resolveTeamLogoFromEnriched } from "@/lib/teams/teamLogoResolver";

const METRIC_ICONS = {
  shots: Target,
  sot: Crosshair,
  dangerous: Zap,
  corners: Flag,
  possession: Shield,
  cards: Shield,
  pressure: Gauge,
  momentum: Activity,
} as const;

export type MatchPanelCardProps = {
  match: EnrichedLiveMatch;
  activeTab: MatchTabId;
  onTabChange: (tab: MatchTabId) => void;
  timelineWindow: TimelineWindow;
  onTimelineWindowChange: (window: TimelineWindow) => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onClose?: () => void;
  onExpand?: () => void;
  expandLabel?: string;
  compact?: boolean;
  contextView?: MatchContextResult;
  highlight?: boolean;
};

export default function MatchPanelCard({
  match,
  activeTab,
  onTabChange,
  timelineWindow,
  onTimelineWindowChange,
  isFavorite = false,
  onToggleFavorite,
  onClose,
  onExpand,
  expandLabel = "Expandir",
  compact = false,
  contextView,
  highlight = false,
}: MatchPanelCardProps) {
  const scoreHome = match.scoreKnown ? String(match.homeScore ?? 0) : "—";
  const scoreAway = match.scoreKnown ? String(match.awayScore ?? 0) : "—";
  const homeOdd = match.odds.primary > 0 ? match.odds.primary.toFixed(2) : null;
  const awayOdd =
    match.odds.fullTimeResult != null && match.odds.fullTimeResult > 0
      ? match.odds.fullTimeResult.toFixed(2)
      : match.odds.over15 > 0
        ? match.odds.over15.toFixed(2)
        : null;

  const metrics = useMemo(() => buildMatchMetricBoxes(match), [match]);
  const footer = footerMetrics(match);
  const context = contextView ?? evaluateMatchContext(match);
  const decision = useMemo(() => mapOperationalDecision(match, context), [match, context]);
  const homeLogo = useMemo(() => resolveTeamLogoFromEnriched(match, "home"), [match]);
  const awayLogo = useMemo(() => resolveTeamLogoFromEnriched(match, "away"), [match]);

  const levelClass =
    decision.selo === "EVITAR" || decision.selo === "ALERTA"
      ? "gp-sports__panel-card--watch"
      : decision.selo === "OPORTUNIDADE"
        ? "gp-sports__panel-card--opportunity"
        : "";

  return (
    <article
      className={`gp-sports__panel-card ${levelClass} ${highlight ? "gp-sports__panel-card--highlight" : ""}`}
      data-fixture={match.fixtureId}
      data-context-level={context.level}
    >
      {highlight ? (
        <div className="gp-sports__highlight-banner">Jogo em destaque — maior prioridade agora</div>
      ) : null}

      <header className="gp-sports__panel-top">
        <span className="gp-sports__league-row">
          <LeagueFlag league={match.league} />
          <span>{leagueLine(match)}</span>
        </span>
        <div className="gp-sports__panel-actions">
          {onExpand ? (
            <button
              type="button"
              title={expandLabel}
              aria-label={expandLabel}
              onClick={(e) => {
                e.stopPropagation();
                onExpand();
              }}
            >
              {expandLabel === "Recolher" ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </button>
          ) : null}
          <button
            type="button"
            title={isFavorite ? "Remover dos favoritos" : "Favoritar"}
            aria-label="Favorito"
            aria-pressed={isFavorite}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite?.();
            }}
          >
            <Star
              className={`h-3.5 w-3.5 ${isFavorite ? "fill-[#FF7A45] text-[#FF7A45]" : ""}`}
            />
          </button>
          {onClose ? (
            <button
              type="button"
              title="Fechar painel"
              aria-label="Fechar"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </header>

      {match.isPreMatch && !match.isLive ? (
        <div className="gp-sports__pregame">
          <p className="font-semibold text-[#1B2430]">Não iniciado</p>
          <p className="mt-2 text-sm">
            {match.kickoffLabel
              ? `A partida iniciará em ${match.kickoffLabel}`
              : "Aguardando horário de início"}
          </p>
        </div>
      ) : (
        <div className="gp-sports__scoreboard">
          <div className="gp-sports__team-col">
            <div className="gp-sports__team-faceoff">
              <TeamBadge teamName={match.homeTeam} logoUrl={homeLogo} size="lg" />
              <span className="gp-sports__team-name">{match.homeTeam}</span>
            </div>
            {homeOdd ? (
              <span className="gp-sports__odd" title="Cotação do mandante">
                Cotação {homeOdd}
              </span>
            ) : null}
          </div>
          <div className="gp-sports__score-center">
            <div className="gp-sports__score" aria-label="Placar">
              {scoreHome} × {scoreAway}
            </div>
            <p className="gp-sports__minute">{match.minuteLabel}</p>
          </div>
          <div className="gp-sports__team-col gp-sports__team-col--away">
            <div className="gp-sports__team-faceoff gp-sports__team-faceoff--away">
              <span className="gp-sports__team-name">{match.awayTeam}</span>
              <TeamBadge teamName={match.awayTeam} logoUrl={awayLogo} size="lg" />
            </div>
            {awayOdd ? (
              <span className="gp-sports__odd" title="Cotação do visitante">
                Cotação {awayOdd}
              </span>
            ) : null}
          </div>
        </div>
      )}

      {!compact && match.isLive ? <GPIHero match={match} /> : null}

      {!compact && match.isLive && (
        <>
          <OperationalDecisionPanel match={match} context={context} />
          <LiveTacticalField match={match} context={context} />

          {metrics.length > 0 ? (
            <div className="gp-sports__metrics-section">
              <div className="gp-sports__metrics-section-head">
                <h4 className="gp-sports__metrics-section-title">Estatísticas ao vivo</h4>
                <p className="gp-sports__metrics-section-sub">
                  Mandante × visitante — só exibido quando a fonte envia o dado
                </p>
              </div>
              <div className="gp-sports__metrics-row">
                {metrics.map((m) => {
                  const Icon = METRIC_ICONS[m.id as keyof typeof METRIC_ICONS] ?? Gauge;
                  return (
                    <MetricIconBox
                      key={m.id}
                      icon={Icon}
                      title={m.title}
                      value={m.value}
                      hint={m.hint}
                      tooltip={m.tooltip}
                    />
                  );
                })}
              </div>
            </div>
          ) : null}

          <SmartPressureTimeline
            match={match}
            context={context}
            window={timelineWindow}
            onWindowChange={onTimelineWindowChange}
          />

          {footer.length > 0 ? (
            <div className="gp-sports__footer-metrics-wrap">
              <h4 className="gp-sports__footer-metrics-title">Resumo da leitura</h4>
              <div className="gp-sports__footer-metrics">
                {footer.map((f) => (
                  <div key={f.label} className="gp-sports__footer-metric" title={f.hint}>
                    <span>{f.label}</span>
                    <strong>{f.value}</strong>
                    <em>{f.hint}</em>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </article>
  );
}
