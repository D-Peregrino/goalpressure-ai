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
import LiveTacticalField from "@/components/terminal/field/LiveTacticalField";
import OperationalDecisionPanel from "@/components/terminal/decision/OperationalDecisionPanel";
import SmartPressureTimeline from "@/components/terminal/timeline/SmartPressureTimeline";
import { mapOperationalDecision } from "@/components/terminal/decision/decisionMapper";
import PredictivePanel from "@/components/terminal/predictive/PredictivePanel";
import GPIHero from "@/components/terminal/gpi/GPIHero";
import GPIBreakdown from "@/components/terminal/gpi/GPIBreakdown";

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
            <TeamBadge teamName={match.awayTeam} logoUrl={match.awayLogo} size="md" />
            <span className="gp-sports__team-name">{match.awayTeam}</span>
            {awayOdd ? (
              <span className="gp-sports__odd" title="Cotação do visitante">
                Cotação {awayOdd}
              </span>
            ) : null}
          </div>
        </div>
      )}

      {!compact && match.isLive ? <GPIHero match={match} /> : null}

      {!compact && (
        <>
          <OperationalDecisionPanel match={match} context={context} />
          <GPIBreakdown match={match} />
          <PredictivePanel match={match} context={context} />
          <LiveTacticalField match={match} context={context} />

          <section className="gp-sports__context-read">
            <h4 className="gp-sports__context-title">Leitura contextual da partida</h4>
            <p className="gp-sports__context-sub">
              Resumo automático do que está acontecendo no jogo agora
            </p>
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
            {context.badges.length > 0 ? (
              <div className="gp-sports__context-badges">
                {context.badges.map((badge) => (
                  <span key={badge} className="gp-sports__context-badge">
                    {badge}
                  </span>
                ))}
              </div>
            ) : null}
            <p className="gp-sports__context-reco">{context.recomendacao}</p>
          </section>

          <div className="gp-sports__section-block">
            <h4 className="gp-sports__section-block-title">Detalhes do jogo</h4>
            <p className="gp-sports__section-block-sub">Informações por fase e por mercado</p>
            <LiveMatchTabs active={activeTab} onChange={onTabChange} />
            <MatchTabContent tab={activeTab} match={match} />
          </div>

          <div className="gp-sports__metrics-section">
            <div className="gp-sports__metrics-section-head">
              <h4 className="gp-sports__metrics-section-title">Indicadores de pressão</h4>
              <p className="gp-sports__metrics-section-sub">
                Números mandante × visitante com descrição em cada caixa
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

          <SmartPressureTimeline
            match={match}
            context={context}
            window={timelineWindow}
            onWindowChange={onTimelineWindowChange}
          />

          <div className="gp-sports__footer-metrics-wrap">
            <h4 className="gp-sports__footer-metrics-title">Métricas finais da partida</h4>
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
        </>
      )}
    </article>
  );
}
