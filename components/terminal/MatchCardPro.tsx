"use client";

import Link from "next/link";
import { memo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, Star, TrendingDown } from "lucide-react";
import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import { useSubscription } from "@/contexts/SubscriptionContext";
import TeamBadge from "@/components/matches/TeamBadge";
import { getTeamColor } from "@/lib/ui/teamColors";
import PressureComparisonBar from "@/components/matches/PressureComparisonBar";
import OperationalStateBadge from "@/components/terminal/OperationalStateBadge";
import SportsTooltip from "@/components/ui/SportsTooltip";
import MiniMomentumChart from "@/components/terminal/MiniMomentumChart";
import MatchCardAuditStrip from "@/components/terminal/MatchCardAuditStrip";
import {
  insightDoJogo,
  rotuloIntensidade,
  rotuloSteam,
  rotuloVantagem,
  TOOLTIPS,
} from "@/lib/ux/sportsLanguage";

function MatchCardProInner({
  match,
  isFavorite,
  onToggleFavorite,
  layout = "grid",
  pressureHistory,
  auditMode = false,
}: {
  match: EnrichedLiveMatch;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  pressureHistory?: number[];
  layout?: "grid" | "list";
  auditMode?: boolean;
}) {
  const { can, limits } = useSubscription();
  const [detalhes, setDetalhes] = useState(false);
  const isLive = match.isLive;
  const isPreMatch = match.isPreMatch;
  const scoreDisplay = match.scoreKnown
    ? `${match.homeScore ?? 0} – ${match.awayScore ?? 0}`
    : isPreMatch
      ? "0 : 0"
      : "– : –";
  const homeColor = getTeamColor(match.homeTeam);
  const awayColor = getTeamColor(match.awayTeam);

  const steamLabel = rotuloSteam(match.steamDirection, match.steamMove);
  const steamPulse =
    match.steamMove &&
    can("steam_alerts") &&
    (match.steamDirection === "DOWN" ||
      (match.oddsDrift != null && match.oddsDrift <= -0.05));

  const insight =
    match.cardInsight ||
    (isPreMatch
      ? match.kickoffLabel
        ? `Começa às ${match.kickoffLabel} — aguardando início.`
        : "Aguardando início — pressão live após o apito inicial."
      : insightDoJogo({
          operationalState: match.operationalState,
          pressureScore: match.pressureScore,
          edgePercent: match.edgePercent,
          steamMove: match.steamMove,
          steamDirection: match.steamDirection,
          chaosIndex: match.chaosIndex,
        }));

  const intensidadePct = isPreMatch ? 0 : Math.min(100, match.pressureScore);
  const showEdge =
    can("edge_full") &&
    match.edgePercent != null &&
    !match.lowConfidence;
  const isOpportunity = match.operationalState === "EXECUTE";
  const heatIntensity = isPreMatch ? 0 : Math.min(1, match.pressureScore / 100);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -6, transition: { duration: 0.22 } }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={`gp-sport-card gp-sport-card--premium ${isLive ? "gp-sport-card--live" : ""} ${isPreMatch ? "gp-sport-card--prematch" : ""} ${steamPulse ? "gp-sport-card--steam" : ""} ${isOpportunity ? "gp-sport-card--opportunity" : ""} ${layout === "list" ? "gp-sport-card--list" : ""} gp-sport-card--op-${match.operationalState.toLowerCase()}`}
    >
      {isOpportunity && <div className="gp-sport-card__opp-ring" aria-hidden />}
      <div
        className="gp-sport-card__heat"
        style={{ opacity: heatIntensity * 0.55 }}
        aria-hidden
      />
      <div
        className="gp-sport-card__glow"
        style={{
          background: `linear-gradient(135deg, ${homeColor}28 0%, transparent 42%, ${awayColor}24 100%)`,
        }}
        aria-hidden
      />
      <div className="gp-sport-card__shine" aria-hidden />

      <header className="gp-sport-card__top">
        <span className="gp-sport-card__league">{match.league}</span>
        <div className="gp-sport-card__top-actions">
          {isLive && (
            <span className="gp-sport-card__live">
              <span className="gp-sport-card__live-dot" />
              AO VIVO
            </span>
          )}
          {isPreMatch && (
            <span className="gp-sport-card__prematch">Pré-jogo</span>
          )}
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
            className="gp-sport-card__open"
            aria-label="Abrir central do jogo"
          >
            <ChevronRight className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <div className="gp-sport-card__hero">
        <div className="gp-sport-card__club">
          <TeamBadge teamName={match.homeTeam} logoUrl={match.homeLogo} size="xl" />
          <p className="gp-sport-card__club-name">{match.homeTeam}</p>
        </div>

        <div className="gp-sport-card__score-block">
          <p className="gp-sport-card__score tabular-nums">{scoreDisplay}</p>
          {isLive ? (
            <p className="gp-sport-card__minute gp-sport-card__minute--pulse tabular-nums">
              {match.minuteLabel}
            </p>
          ) : isPreMatch ? (
            <p className="gp-sport-card__minute gp-sport-card__kickoff tabular-nums">
              {match.kickoffLabel ? `Início ${match.kickoffLabel}` : "Aguardando início"}
            </p>
          ) : (
            <p className="gp-sport-card__minute">{match.displayStatus}</p>
          )}
        </div>

        <div className="gp-sport-card__club gp-sport-card__club--away">
          <TeamBadge teamName={match.awayTeam} logoUrl={match.awayLogo} size="xl" />
          <p className="gp-sport-card__club-name">{match.awayTeam}</p>
        </div>
      </div>

      <p className="gp-sport-card__insight">{insight}</p>
      {match.cardInsightSecondary && (
        <p className="gp-sport-card__insight-secondary">{match.cardInsightSecondary}</p>
      )}
      {match.tacticalNarrative && (
        <p
          className={`gp-sport-card__tactical ${match.tacticalConfidence < 40 || match.tacticalLimitedReading ? "gp-sport-card__tactical--low" : ""}`}
        >
          {match.tacticalNarrative}
        </p>
      )}
      {(match.tacticalProfileLabel || match.tacticalIntensity > 0) && (
        <div className="gp-sport-card__tactical-meta">
          <span className="gp-sport-card__tactical-profile">{match.tacticalProfileLabel}</span>
          {!isPreMatch && match.tacticalIntensity > 0 && (
            <span className="gp-sport-card__tactical-intensity tabular-nums">
              Intensidade tática {Math.round(match.tacticalIntensity)}%
            </span>
          )}
          {match.tacticalConfidence < 40 && (
            <span className="gp-sport-card__tactical-warn">Leitura tática limitada</span>
          )}
          {match.tacticalLimitedReading &&
            match.tacticalConfidence >= 40 && (
              <span className="gp-sport-card__tactical-warn">leitura preliminar</span>
            )}
        </div>
      )}
      {match.dominanceNarrative &&
        match.tacticalConfidence < 35 &&
        !match.tacticalNarrative && (
          <p className="gp-sport-card__dominance">{match.dominanceNarrative}</p>
        )}

      <div className="gp-sport-card__pills">
        <OperationalStateBadge state={match.operationalState} />
        {match.lowConfidence && (
          <span className="gp-sport-card__pill gp-sport-card__pill--low-conf" title="Poucos dados live para este jogo">
            Baixa confiança
          </span>
        )}
        {!isPreMatch && (
          <span className="gp-sport-card__pill gp-sport-card__pill--vol">
            {match.volatilityLabel}
          </span>
        )}
        {steamLabel && (
          <span className="gp-sport-card__pill gp-sport-card__pill--steam">
            <TrendingDown className="h-3.5 w-3.5" />
            {steamLabel}
          </span>
        )}
      </div>

      {!isPreMatch ? (
        <div className="gp-sport-card__intensity">
          <div className="gp-sport-card__intensity-head">
            <SportsTooltip label="Intensidade" tip={TOOLTIPS.intensidade} />
            <span className="tabular-nums">{Math.round(intensidadePct)}%</span>
          </div>
          <div className="gp-sport-card__intensity-bar">
            <motion.span
              className="gp-sport-card__intensity-fill"
              initial={{ width: 0 }}
              animate={{ width: `${intensidadePct}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <p className="gp-sport-card__intensity-caption">
            {match.intensityLabel || rotuloIntensidade(match.pressureScore)}
          </p>
          <div className="gp-sport-card__momentum-row">
            <span className="gp-sport-card__momentum-label">Ritmo recente</span>
            <MiniMomentumChart points={pressureHistory} height={40} />
          </div>
        </div>
      ) : (
        <p className="gp-sport-card__prematch-note">Sem pressão live ainda — odds pré-jogo abaixo.</p>
      )}

      {showEdge && (
        <p className="gp-sport-card__vantagem">
          <SportsTooltip tip={TOOLTIPS.vantagem}>
            <span className="gp-sport-card__vantagem-label">Vantagem · </span>
          </SportsTooltip>
          {rotuloVantagem(match.edgePercent)}
        </p>
      )}

      {!isPreMatch && (
        <div className="gp-sport-card__pressure px-1">
          <PressureComparisonBar
            homeTeam={match.homeTeam}
            awayTeam={match.awayTeam}
            homePressure={match.homePressure}
            awayPressure={match.awayPressure}
            dominantSide={match.dominantSide}
          />
        </div>
      )}

      <button
        type="button"
        className="gp-sport-card__toggle-detalhes"
        onClick={(e) => {
          e.preventDefault();
          setDetalhes((d) => !d);
        }}
      >
        {detalhes ? "Menos detalhes" : "Ver odds e números"}
      </button>

      {auditMode && match.cardAudit && (
        <MatchCardAuditStrip
          dataQuality={match.dataQuality}
          audit={match.cardAudit}
          operationalState={match.operationalState}
          tacticalProfile={match.tacticalProfile}
          tacticalReasoning={match.tacticalReasoning}
          tacticalConfidence={match.tacticalConfidence}
        />
      )}

      {detalhes && (
        <div className="gp-sport-card__detalhes">
          <div className="gp-sport-card__detalhes-grid">
            <span>
              Odd <strong className="tabular-nums">{match.odds.primary.toFixed(2)}</strong>
            </span>
            {match.fairOdd != null && can("fair_odd") && (
              <span>
                Justa <strong className="tabular-nums">{match.fairOdd.toFixed(2)}</strong>
              </span>
            )}
            <span>
              Ritmo <strong className="tabular-nums">{Math.round(match.momentum)}</strong>
            </span>
            <span>
              Volatilidade <strong className="tabular-nums">{Math.round(match.chaosIndex)}</strong>
            </span>
            <span>
              Confiança <strong className="tabular-nums">{Math.round(match.confidence)}</strong>
            </span>
          </div>
          {match.markets.length > 0 && (
            <div className="gp-sport-card__markets">
              {match.markets.slice(0, limits.marketsPerMatch).map((m) => (
                <span key={`${m.market}-${m.odd}`} className="gp-odds-pill">
                  <span className="gp-odds-pill__market">{m.market}</span>
                  <span className="gp-odds-pill__odd tabular-nums">
                    {m.odd != null && m.odd >= 1.01 ? m.odd.toFixed(2) : "—"}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.article>
  );
}

const MatchCardPro = memo(MatchCardProInner);
export default MatchCardPro;
