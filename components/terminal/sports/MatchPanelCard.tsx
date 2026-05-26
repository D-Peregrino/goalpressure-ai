"use client";

import { useMemo, useState } from "react";
import {
  Crosshair,
  Flag,
  Gauge,
  Maximize2,
  Shield,
  Star,
  Target,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import TeamBadge from "@/components/matches/TeamBadge";
import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import {
  evDisplay,
  footerMetrics,
  leagueLine,
  possessionPair,
  pressurePair,
} from "@/lib/terminal/sportsDisplay";
import { roundDisplay } from "@/lib/terminal/formatDisplay";
import LiveMatchTabs, { type MatchTabId } from "./LiveMatchTabs";
import MetricIconBox from "./MetricIconBox";
import PressureField from "./PressureField";
import PressureTimeline from "./PressureTimeline";

type MatchPanelCardProps = {
  match: EnrichedLiveMatch;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onClose?: () => void;
  compact?: boolean;
};

function statValue(total: number): string {
  if (!Number.isFinite(total) || total <= 0) return "—";
  return String(Math.round(total));
}

export default function MatchPanelCard({
  match,
  isFavorite = false,
  onToggleFavorite,
  onClose,
  compact = false,
}: MatchPanelCardProps) {
  const [tab, setTab] = useState<MatchTabId>(match.isLive ? "live" : "pre");

  const scoreHome = match.scoreKnown ? String(match.homeScore ?? 0) : "—";
  const scoreAway = match.scoreKnown ? String(match.awayScore ?? 0) : "—";
  const homeOdd = match.odds.primary > 0 ? match.odds.primary.toFixed(2) : null;
  const awayOdd =
    match.odds.fullTimeResult != null && match.odds.fullTimeResult > 0
      ? match.odds.fullTimeResult.toFixed(2)
      : match.odds.over15 > 0
        ? match.odds.over15.toFixed(2)
        : null;

  const metrics = useMemo(
    () => [
      { icon: Target, label: "Finalizações", value: statValue(match.shots) },
      {
        icon: Crosshair,
        label: "No alvo",
        value: statValue(match.shotsOnTarget),
      },
      {
        icon: Zap,
        label: "Ataques perig.",
        value: statValue(match.dangerousAttacks),
      },
      { icon: Flag, label: "Escanteios", value: statValue(match.corners) },
      { icon: Shield, label: "Posse", value: possessionPair(match) },
      { icon: Shield, label: "Cartões", value: "—" },
      { icon: Gauge, label: "Pressão", value: pressurePair(match) },
      { icon: TrendingUp, label: "EV", value: evDisplay(match) },
    ],
    [match]
  );

  const footer = footerMetrics(match);

  return (
    <article className="gp-sports__panel-card">
      <header className="gp-sports__panel-top">
        <span>{leagueLine(match)}</span>
        <div className="gp-sports__panel-actions">
          <button type="button" title="Expandir" aria-label="Expandir">
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title={isFavorite ? "Remover dos favoritos" : "Favoritar"}
            aria-label="Favorito"
            onClick={onToggleFavorite}
          >
            <Star
              className={`h-3.5 w-3.5 ${isFavorite ? "fill-[#FF7A45] text-[#FF7A45]" : ""}`}
            />
          </button>
          {onClose ? (
            <button type="button" title="Fechar" aria-label="Fechar" onClick={onClose}>
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
            {homeOdd ? <span className="gp-sports__odd">{homeOdd}</span> : null}
          </div>
          <div className="gp-sports__score-center">
            <div className="gp-sports__score">
              {scoreHome} - {scoreAway}
            </div>
            <p className="gp-sports__minute">{match.minuteLabel}</p>
          </div>
          <div className="gp-sports__team-col gp-sports__team-col--away">
            <TeamBadge teamName={match.awayTeam} logoUrl={match.awayLogo} size="md" />
            <span className="gp-sports__team-name">{match.awayTeam}</span>
            {awayOdd ? <span className="gp-sports__odd">{awayOdd}</span> : null}
          </div>
        </div>
      )}

      {!compact && (
        <>
          <PressureField match={match} />
          <LiveMatchTabs active={tab} onChange={setTab} />
          <TabPanel tab={tab} match={match} />
          <div className="gp-sports__metrics-row">
            {metrics.map((m) => (
              <MetricIconBox key={m.label} icon={m.icon} label={m.label} value={m.value} />
            ))}
          </div>
          <PressureTimeline match={match} />
          <div className="gp-sports__footer-metrics">
            {footer.map((f) => (
              <div key={f.label} className="gp-sports__footer-metric">
                <span>{f.label}</span>
                <strong>{f.value}</strong>
              </div>
            ))}
          </div>
        </>
      )}
    </article>
  );
}

function TabPanel({ tab, match }: { tab: MatchTabId; match: EnrichedLiveMatch }) {
  const content = useMemo(() => {
    switch (tab) {
      case "pre":
        return match.kickoffLabel
          ? `Pré-jogo · início previsto: ${match.kickoffLabel}`
          : "Pré-jogo · aguardando dados";
      case "live":
        return match.displayInsight || match.cardInsight || "Aguardando leitura ao vivo";
      case "odds":
        return match.markets.length > 0
          ? match.markets
              .slice(0, 6)
              .map((m) => `${m.market}: ${m.odd?.toFixed(2) ?? "—"}`)
              .join(" · ")
          : "Aguardando odds";
      case "stats":
        return `xG ${roundDisplay(match.xG)} · finalizações ${match.shots} · posse ${possessionPair(match)} · pressão ${roundDisplay(match.pressureScore)}`;
      case "players":
        return "Aguardando dados de jogadores";
      case "traits":
        return match.tacticalNarrative || match.tacticalProfileLabel || "Aguardando características";
      case "h2h":
        return match.dominanceNarrative || match.cardInsightSecondary || "Aguardando confronto direto";
      default:
        return "Aguardando dados";
    }
  }, [tab, match]);

  return <div className="gp-sports__tab-panel">{content}</div>;
}
