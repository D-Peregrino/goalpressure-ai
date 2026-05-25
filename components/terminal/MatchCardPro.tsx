"use client";

import Link from "next/link";
import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cardFlow, FLOW_EASE, layoutTransition } from "@/components/ui/terminal/motion";
import { ChevronRight, Star } from "lucide-react";
import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import { useSubscription } from "@/contexts/SubscriptionContext";
import TeamBadge from "@/components/matches/TeamBadge";
import { getTeamColor } from "@/lib/ui/teamColors";
import PressureComparisonBar from "@/components/matches/PressureComparisonBar";
import MiniMomentumChart from "@/components/terminal/MiniMomentumChart";
import MatchCardAuditStrip from "@/components/terminal/MatchCardAuditStrip";
import MatchCardStoryAura from "@/components/match-story/MatchCardStoryAura";
import MatchHeatStory from "@/components/match-story/MatchHeatStory";
import { tacticalProfileClass } from "@/lib/match/matchStoryVisual";
import {
  ESTADO_JOGO,
  insightDoJogo,
  rotuloIntensidade,
  rotuloSteam,
  rotuloVantagem,
} from "@/lib/ux/sportsLanguage";
import { getCardFocusTier } from "@/lib/ux/operationalIntelligence";
import TrustIndicator from "@/components/ui/TrustIndicator";
import DataSourceBadge from "@/components/ui/DataSourceBadge";
import {
  classificationGlowClass,
  type PressureClassification,
} from "@/lib/engine/pressure/classifyPressure";

function MatchCardProInner({
  match,
  isFavorite,
  onToggleFavorite,
  layout = "grid",
  pressureHistory,
  auditMode = false,
  momentPick = false,
}: {
  match: EnrichedLiveMatch;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  pressureHistory?: number[];
  layout?: "grid" | "list";
  auditMode?: boolean;
  momentPick?: boolean;
}) {
  const { can, limits } = useSubscription();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const focusTier = getCardFocusTier(match);
  const isLive = match.isLive;
  const isPreMatch = match.isPreMatch;
  const isHot = focusTier === "hot" || focusTier === "ignite";
  const isWarm = focusTier === "warm" || isHot;
  const trustWeight = match.trustVisualWeight ?? 1;

  const scoreDisplay = match.scoreKnown
    ? `${match.homeScore ?? 0} – ${match.awayScore ?? 0}`
    : isPreMatch
      ? "0 : 0"
      : "– : –";
  const homeColor = getTeamColor(match.homeTeam);
  const awayColor = getTeamColor(match.awayTeam);

  const steamLabel = rotuloSteam(match.steamDirection, match.steamMove);
  const insight =
    match.displayInsight ||
    (isPreMatch
      ? match.kickoffLabel
        ? `Início ${match.kickoffLabel}`
        : "Aguardando apito inicial"
      : insightDoJogo({
          operationalState: match.operationalState,
          pressureScore: match.pressureScore,
          edgePercent: match.edgePercent,
          steamMove: match.steamMove,
          steamDirection: match.steamDirection,
          chaosIndex: match.chaosIndex,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          minuteLabel: match.minuteLabel,
          scoreKnown: match.scoreKnown,
          homeScore: match.homeScore,
          awayScore: match.awayScore,
        }));

  const showEdge =
    can("edge_full") &&
    match.edgePercent != null &&
    !match.lowConfidence &&
    isWarm;

  const heatIntensity = isPreMatch
    ? 0
    : Math.min(1, match.pressureScore / 100) *
      trustWeight *
      (isHot ? 1 : isWarm ? 0.45 : 0.12);

  const pressureClass = (match.pressureClassification ??
    (match.pressureScore >= 90
      ? "EXTREME"
      : match.pressureScore >= 75
        ? "VERY_HIGH"
        : match.pressureScore >= 60
          ? "HIGH"
          : match.pressureScore >= 40
            ? "MEDIUM"
            : "LOW")) as PressureClassification;

  const badgeSize = isHot ? "xl" : isWarm ? "lg" : "md";

  return (
    <motion.article
      layout
      layoutId={`card-${match.fixtureId}`}
      variants={cardFlow}
      initial="hidden"
      animate="show"
      transition={layoutTransition}
      className={[
        "gp-sport-card",
        "gp-sport-card--layout-v2",
        "gp-sport-card--focus",
        "gp-flow-card",
        `gp-sport-card--focus-${focusTier}`,
        `gp-sport-card--trust-${match.trustLevel}`,
        classificationGlowClass(pressureClass),
        (match.evPercent ?? 0) >= 5
          ? "gp-ev-glow--positive"
          : (match.evPercent ?? 0) < -2
            ? "gp-ev-glow--trap"
            : (match.evPercent ?? 0) >= 1
              ? "gp-ev-glow--watch"
              : "",
        tacticalProfileClass(match.tacticalProfile),
        isLive ? "gp-sport-card--live" : "",
        isPreMatch ? "gp-sport-card--prematch" : "",
        momentPick ? "gp-sport-card--moment-pick" : "",
        layout === "list" ? "gp-sport-card--list" : "",
      ].join(" ")}
    >
      {isWarm && (
        <div className="gp-sport-card__fx" aria-hidden>
          {isHot && trustWeight >= 0.65 && (
            <MatchCardStoryAura
              profile={match.tacticalProfile}
              offensiveControl={match.offensiveControl}
              homePressure={match.homePressure}
              awayPressure={match.awayPressure}
              homeColor={homeColor}
              awayColor={awayColor}
              momentum={match.momentum}
            />
          )}
          <div
            className="gp-sport-card__heat"
            style={{ opacity: heatIntensity * 0.5 }}
          />
        </div>
      )}

      <div className="gp-sport-card__stack">
        {/* Camada 1 — primária: placar + decisão em &lt;2s */}
        <div className="gp-sport-card__layer gp-sport-card__layer--primary">
          <header className="gp-sport-card__section gp-sport-card__section--header">
            <span className="gp-type-label gp-sport-card__league gp-clamp-1">{match.league}</span>
            <div className="gp-sport-card__top-actions">
              {isLive && match.evPercent != null && match.evPercent >= 3 && (
                <span className="gp-ev-badge gp-ev-badge--value">EV+</span>
              )}
              {isLive &&
                (match.evDistortionLevel === "HIGH" ||
                  match.evDistortionLevel === "EXTREME") && (
                  <span className="gp-ev-badge gp-ev-badge--edge">DISTORÇÃO</span>
                )}
              {isLive && match.evConfidenceClass === "ELITE" && (
                <span className="gp-ev-badge gp-ev-badge--confidence">HIGH CONF</span>
              )}
              {isLive && (
                <DataSourceBadge source="sportmonks" className="gp-sport-card__source-badge" />
              )}
              {isLive && (
              <span
                className="gp-sport-card__live-dot gp-sport-card__live-dot--pulse"
                title="Ao vivo"
              />
            )}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onToggleFavorite();
                }}
                className="gp-icon-btn gp-sport-card__icon-btn"
                aria-label={isFavorite ? "Remover favorito" : "Favoritar"}
              >
                <Star
                  className={`h-4 w-4 ${isFavorite ? "fill-[var(--gp-red)] text-[var(--gp-red)]" : "opacity-40"}`}
                />
              </button>
              <Link
                href={`/match/${encodeURIComponent(match.fixtureId)}`}
                className="gp-sport-card__open"
                aria-label="Abrir jogo"
              >
                <ChevronRight className="h-5 w-5" />
              </Link>
            </div>
          </header>

          <section className="gp-sport-card__section gp-sport-card__section--hero">
            <div className="gp-sport-card__hero">
              <div className="gp-sport-card__club gp-sport-card__club--home">
                <TeamBadge
                  teamName={match.homeTeam}
                  logoUrl={match.homeLogo}
                  size={badgeSize}
                />
                <p className="gp-type-caption gp-sport-card__club-name gp-clamp-1">{match.homeTeam}</p>
              </div>
              <div className="gp-sport-card__score-block">
                <p className="gp-type-score gp-sport-card__score tabular-nums">{scoreDisplay}</p>
                <p
                  className={`gp-type-caption gp-sport-card__minute tabular-nums ${isLive ? "gp-sport-card__minute--pulse" : ""}`}
                >
                  {isLive
                    ? match.minuteLabel
                    : isPreMatch
                      ? match.kickoffLabel ?? "Pré-jogo"
                      : match.displayStatus}
                </p>
              </div>
              <div className="gp-sport-card__club gp-sport-card__club--away">
                <TeamBadge
                  teamName={match.awayTeam}
                  logoUrl={match.awayLogo}
                  size={badgeSize}
                />
                <p className="gp-type-caption gp-sport-card__club-name gp-clamp-1">{match.awayTeam}</p>
              </div>
            </div>
          </section>

          <p className="gp-type-narrative gp-sport-card__decision gp-clamp-2" title={insight}>
            {insight}
          </p>

          {isLive && !match.premiumFeed && match.dataQuality === "sparse" && (
            <p className="gp-type-caption gp-sport-card__stats-pending">
              Aguardando estatísticas live
            </p>
          )}

          {isLive && (
            <div className="gp-sport-card__engine-metrics tabular-nums">
              <span>P {Math.round(match.pressureScore)}</span>
              <span>M {match.engineMomentumScore ?? Math.round(match.momentum)}</span>
              <span>A {match.engineAccelerationScore ?? "—"}</span>
              <span>T {match.engineTerritorialScore ?? "—"}</span>
              {match.evPercent != null && (
                <span className={match.evPercent >= 3 ? "gp-ev-metric--pos" : ""}>
                  EV {match.evPercent.toFixed(1)}%
                </span>
              )}
              {match.fairOdd != null && match.marketOdd != null && (
                <span>
                  {match.fairOdd.toFixed(2)} → {match.marketOdd.toFixed(2)}
                </span>
              )}
              {match.engineActiveSignal && (
                <span className="gp-sport-card__engine-signal">{match.engineActiveSignal}</span>
              )}
              {match.evSignalType && (
                <span className="gp-sport-card__engine-signal">{match.evSignalType}</span>
              )}
            </div>
          )}

          <div className="gp-sport-card__state-row">
            <TrustIndicator
              level={match.trustLevel}
              label={match.trustLabel}
              sources={match.trustSources}
              compact
            />
            <span
              className={`gp-focus-state gp-focus-state--${match.operationalState.toLowerCase()}`}
            >
              {ESTADO_JOGO[match.operationalState]}
            </span>
            {steamLabel && isWarm && (
              <span className="gp-type-caption gp-sport-card__hint">{steamLabel}</span>
            )}
          </div>
        </div>

        {/* Camada 2 — contextual: só jogos warm+ */}
        {isWarm && !isPreMatch && (
          <div className="gp-sport-card__layer gp-sport-card__layer--context">
            <div className="gp-sport-card__pressure">
              <PressureComparisonBar
                homeTeam={match.homeTeam}
                awayTeam={match.awayTeam}
                homePressure={match.homePressure}
                awayPressure={match.awayPressure}
                dominantSide={match.dominantSide}
              />
            </div>
            {showEdge && (
              <p className="gp-type-metric gp-sport-card__vantagem-inline gp-clamp-1">
                {rotuloVantagem(match.edgePercent)}
              </p>
            )}
          </div>
        )}

        {/* Camada 3 — drawer: números, heat, pills */}
        <footer className="gp-sport-card__layer gp-sport-card__layer--drawer">
          <button
            type="button"
            className="gp-type-cta gp-sport-card__drawer-toggle"
            onClick={(e) => {
              e.preventDefault();
              setDrawerOpen((d) => !d);
            }}
            aria-expanded={drawerOpen}
          >
            {drawerOpen ? "Menos" : "Mais contexto"}
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

          <AnimatePresence initial={false}>
            {drawerOpen && (
              <motion.div
                key="drawer"
                className="gp-sport-card__drawer gp-sport-card__drawer-flow"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.45, ease: FLOW_EASE }}
                style={{ overflow: "hidden" }}
              >
              {match.cardInsightSecondary && (
                <p className="gp-sport-card__drawer-line gp-clamp-2">
                  {match.cardInsightSecondary}
                </p>
              )}
              {!isPreMatch && isHot && can("tactical_insights") && (
                <MatchHeatStory
                  profile={match.tacticalProfile}
                  homeTeam={match.homeTeam}
                  awayTeam={match.awayTeam}
                  homePressure={match.homePressure}
                  awayPressure={match.awayPressure}
                  momentum={match.momentum}
                  tacticalIntensity={match.tacticalIntensity}
                  offensiveControl={match.offensiveControl}
                  compact
                />
              )}
              {!isPreMatch && (
                <>
                  {can("tactical_insights") ? (
                    <>
                      <p className="gp-sport-card__drawer-meta">
                        {match.intensityLabel || rotuloIntensidade(match.pressureScore)}
                      </p>
                      {pressureHistory && pressureHistory.length > 1 && (
                        <div className="gp-sport-card__momentum-chart">
                          <MiniMomentumChart points={pressureHistory} height={32} />
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="gp-sport-card__drawer-locked">
                      Leitura tática completa no{" "}
                      <a href="/upgrade?feature=tactical_insights">Pro</a>
                    </p>
                  )}
                </>
              )}
              {match.trustLevel === "limited" && (
                <p className="gp-sport-card__drawer-warn">{match.trustLabel}</p>
              )}
              <div className="gp-sport-card__detalhes-grid">
                <span>
                  Odd{" "}
                  <strong className="tabular-nums">
                    {match.odds.primary.toFixed(2)}
                  </strong>
                </span>
                {match.fairOdd != null && can("fair_odd") && (
                  <span>
                    Justa{" "}
                    <strong className="tabular-nums">{match.fairOdd.toFixed(2)}</strong>
                  </span>
                )}
                <span>
                  Ritmo <strong className="tabular-nums">{Math.round(match.momentum)}</strong>
                </span>
                <span>
                  Vol. <strong className="tabular-nums">{Math.round(match.chaosIndex)}</strong>
                </span>
              </div>
              {match.markets.length > 0 && (
                <div className="gp-sport-card__markets">
                  {match.markets.slice(0, limits.marketsPerMatch).map((m) => (
                    <span key={`${m.market}-${m.odd}`} className="gp-odds-pill">
                      <span className="gp-odds-pill__market gp-clamp-1">{m.market}</span>
                      <span className="gp-odds-pill__odd tabular-nums">
                        {m.odd != null && m.odd >= 1.01 ? m.odd.toFixed(2) : "—"}
                      </span>
                    </span>
                  ))}
                </div>
              )}
              </motion.div>
            )}
          </AnimatePresence>
        </footer>
      </div>
    </motion.article>
  );
}

const MatchCardPro = memo(MatchCardProInner);
export default MatchCardPro;
