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
import LiveMatchTabs, { type MatchTabId } from "./LiveMatchTabs";
import MatchTabContent from "./MatchTabContent";
import MetricIconBox from "./MetricIconBox";
import PressureTimeline from "./PressureTimeline";
import LiveTacticalField from "@/components/terminal/field/LiveTacticalField";

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
  const levelClass =
    context.level === "zona_critica" || context.level === "oportunidade_ev"
      ? "gp-sports__panel-card--critical"
      : context.level === "pressao_crescente"
        ? "gp-sports__panel-card--watch"
        : "";

  return (
    <article
      className={`gp-sports__panel-card ${levelClass}`}
      data-fixture={match.fixtureId}
      data-context-level={context.level}
    >
      <header className="gp-sports__panel-top">
        <span>{leagueLine(match)}</span>
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
            <TeamBadge teamName={match.homeTeam} logoUrl={match.homeLogo} size="md" />
            <span className="gp-sports__team-name">{match.homeTeam}</span>
            {homeOdd ? (
              <span className="gp-sports__odd" title="Odd mandante">
                Odd {homeOdd}
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
            <TeamBadge teamName={match.awayTeam} logoUrl={match.awayLogo} size="md" />
            <span className="gp-sports__team-name">{match.awayTeam}</span>
            {awayOdd ? (
              <span className="gp-sports__odd" title="Odd visitante">
                Odd {awayOdd}
              </span>
            ) : null}
          </div>
        </div>
      )}

      {!compact && (
        <>
          <section className="gp-sports__context-read">
            <h4 className="gp-sports__context-title">Leitura contextual da partida</h4>
            <p className="gp-sports__context-narrative">{context.narrativa}</p>
            <div className="gp-sports__context-grid">
              <div>
                <span>Status operacional</span>
                <strong>{context.statusOperacional}</strong>
              </div>
              <div>
                <span>Nível de intensidade</span>
                <strong>{context.intensidade}</strong>
              </div>
              <div>
                <span>Tendência</span>
                <strong>{context.tendencia}</strong>
              </div>
              <div>
                <span>Leitura de mercado</span>
                <strong>{context.leituraMercado}</strong>
              </div>
            </div>
            <div className="gp-sports__context-badges">
              {context.badges.length > 0 ? (
                context.badges.map((badge) => (
                  <span key={badge} className="gp-sports__context-badge">
                    {badge}
                  </span>
                ))
              ) : (
                <span className="gp-sports__context-badge gp-sports__context-badge--neutral">
                  CONTEXTO ESTÁVEL
                </span>
              )}
            </div>
            <p className="gp-sports__context-reco">{context.recomendacao}</p>
            <div className="gp-sports__context-log">
              <h5>Mini log contextual</h5>
              <ul>
                {context.historico.map((item) => (
                  <li key={`${item.minute}-${item.label}`}>
                    <span>{item.minute}</span> {item.label}
                  </li>
                ))}
              </ul>
            </div>
          </section>
          <LiveTacticalField match={match} context={context} />
          <LiveMatchTabs active={activeTab} onChange={onTabChange} />
          <MatchTabContent tab={activeTab} match={match} />
          <div className="gp-sports__metrics-section">
            <div className="gp-sports__metrics-section-head">
              <h4 className="gp-sports__metrics-section-title">Indicadores de pressão</h4>
              <p className="gp-sports__metrics-section-sub">
                Mandante × visitante — valores do feed ao vivo
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
          <PressureTimeline
            match={match}
            window={timelineWindow}
            onWindowChange={onTimelineWindowChange}
          />
          <div className="gp-sports__footer-metrics">
            {footer.map((f) => (
              <div key={f.label} className="gp-sports__footer-metric" title={f.hint}>
                <span>{f.label}</span>
                <strong>{f.value}</strong>
                <em>{f.hint}</em>
              </div>
            ))}
          </div>
        </>
      )}
    </article>
  );
}
