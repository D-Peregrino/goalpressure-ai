"use client";

import { memo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Zap } from "lucide-react";
import TeamBadge from "@/components/matches/TeamBadge";
import OperationalStateBadge from "@/components/terminal/OperationalStateBadge";
import type { OperationalState } from "@/lib/signals/executionWindow";
import type { NormalizedLiveMatchCore } from "@/lib/ui/normalizeLiveMatch";
import { rotuloIntensidade, TOOLTIPS } from "@/lib/ux/sportsLanguage";
import { getTeamColor } from "@/lib/ui/teamColors";

function MatchCenterHeaderInner({
  core,
  league,
  pressureScore,
  headline,
  operationalState,
  steamMove,
  isLive,
}: {
  core: NormalizedLiveMatchCore;
  league: string;
  pressureScore: number;
  headline: string;
  operationalState: OperationalState;
  steamMove: boolean;
  isLive: boolean;
}) {
  const homeColor = getTeamColor(core.homeTeam);
  const awayColor = getTeamColor(core.awayTeam);
  const homeScore = core.scoreKnown ? (core.homeScore ?? 0) : null;
  const awayScore = core.scoreKnown ? (core.awayScore ?? 0) : null;
  const intensidadePct = Math.min(100, pressureScore);

  return (
    <header
      className={`gp-mc-header gp-mc-header--hero ${isLive ? "gp-mc-header--live" : ""}`}
      style={{
        background: `linear-gradient(165deg, #0a0e14 0%, ${homeColor}18 35%, ${awayColor}14 70%, #0c1018 100%)`,
      }}
    >
      <div className="gp-mc-header__glow" aria-hidden />

      <Link href="/terminal" className="gp-mc-header__back">
        <ArrowLeft className="h-4 w-4" />
        Central ao vivo
      </Link>

      <div className="gp-mc-header__top-row">
        <p className="gp-mc-header__league">{league}</p>
        {isLive && (
          <span className="gp-mc-header__live-badge">
            <span className="gp-mc-header__live-dot" />
            LIVE
          </span>
        )}
      </div>

      <div className="gp-mc-header__scoreboard">
        <div className="gp-mc-header__team">
          <TeamBadge teamName={core.homeTeam} logoUrl={core.homeLogo} size="2xl" />
          <span className="gp-mc-header__name">{core.homeTeam}</span>
        </div>

        <div className="gp-mc-header__center">
          <div className="gp-mc-header__score-row tabular-nums">
            <span className="gp-mc-header__score-num">
              {homeScore != null ? homeScore : "—"}
            </span>
            <span className="gp-mc-header__score-sep">:</span>
            <span className="gp-mc-header__score-num">
              {awayScore != null ? awayScore : "—"}
            </span>
          </div>
          {isLive ? (
            <span className="gp-mc-header__minute gp-mc-minute-pulse tabular-nums">
              {core.minuteLabel}
            </span>
          ) : (
            <span className="gp-mc-header__status">{core.displayStatus}</span>
          )}
        </div>

        <div className="gp-mc-header__team gp-mc-header__team--away">
          <TeamBadge teamName={core.awayTeam} logoUrl={core.awayLogo} size="2xl" />
          <span className="gp-mc-header__name">{core.awayTeam}</span>
        </div>
      </div>

      <motion.p
        key={headline}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="gp-mc-header__headline"
      >
        {headline}
      </motion.p>

      <div className="gp-mc-header__intensity" title={TOOLTIPS.intensidade}>
        <div className="gp-mc-header__intensity-head">
          <span>Intensidade do jogo</span>
          <strong className="tabular-nums">{Math.round(pressureScore)}</strong>
        </div>
        <div className="gp-mc-header__intensity-bar">
          <motion.span
            className="gp-mc-header__intensity-fill"
            initial={{ width: 0 }}
            animate={{ width: `${intensidadePct}%` }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        <p className="gp-mc-header__intensity-caption">
          {rotuloIntensidade(pressureScore)}
        </p>
      </div>

      <div className="gp-mc-header__footer">
        <OperationalStateBadge state={operationalState} />
        {steamMove && (
          <span className="gp-mc-header__steam">
            <Zap className="h-3.5 w-3.5" />
            Mercado acelerando
          </span>
        )}
      </div>
    </header>
  );
}

export default memo(MatchCenterHeaderInner);
