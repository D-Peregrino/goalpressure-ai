"use client";

import Link from "next/link";
import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";
import type { HeroOpportunity } from "@/lib/ux/operationalIntelligence";
import { momentClass, stateLabel } from "@/lib/ux/operationalIntelligence";
import { heroSwap } from "@/components/ui/terminal/motion";
import TeamBadge from "@/components/matches/TeamBadge";

function confidencePct(match: HeroOpportunity["match"]): number {
  const c = Math.max(
    match.tacticalConfidence,
    match.confidence,
    100 - (match.lowConfidence ? 35 : 0)
  );
  return Math.min(100, Math.max(12, Math.round(c)));
}

function OperationalHeroInner({ hero }: { hero: HeroOpportunity | null }) {
  return (
    <div className="gp-op-hero-slot">
      <AnimatePresence mode="wait" initial={false}>
        {!hero ? (
          <motion.section
            key="empty"
            variants={heroSwap}
            initial="hidden"
            animate="show"
            exit="exit"
            className="gp-op-hero gp-op-hero--decision gp-op-hero--empty"
            aria-label="Decisão do sistema"
          >
            <p className="gp-type-label gp-op-hero__decision-label">Leitura principal</p>
            <p className="gp-type-title gp-op-hero__empty-title">Aguardando o próximo momento</p>
          </motion.section>
        ) : (
          <HeroContent key={hero.match.fixtureId} hero={hero} />
        )}
      </AnimatePresence>
    </div>
  );
}

function HeroContent({ hero }: { hero: HeroOpportunity }) {
  const { match, narrative, momentLevel } = hero;
  const scoreDisplay = match.scoreKnown
    ? `${match.homeScore ?? 0} – ${match.awayScore ?? 0}`
    : "– : –";
  const conf = confidencePct(match);

  return (
    <motion.section
      variants={heroSwap}
      initial="hidden"
      animate="show"
      exit="exit"
      className={`gp-op-hero gp-op-hero--decision ${momentClass(momentLevel)}`}
      aria-label="Decisão do sistema"
    >
      <div className="gp-op-hero__accent" aria-hidden />

      <div className="gp-op-hero__inner">
        <div className="gp-op-hero__top">
          <p className="gp-type-label gp-op-hero__decision-label">O sistema identificou</p>
          <span
            className={`gp-focus-state gp-focus-state--${match.operationalState.toLowerCase()}`}
          >
            {stateLabel(match.operationalState)}
          </span>
        </div>

        <div className="gp-op-hero__match-row">
          <div className="gp-op-hero__teams">
            <TeamBadge teamName={match.homeTeam} logoUrl={match.homeLogo} size="xl" />
            <div className="gp-op-hero__score-block">
              <p className="gp-type-score gp-op-hero__score tabular-nums">{scoreDisplay}</p>
              <p className="gp-type-caption gp-op-hero__minute tabular-nums">{match.minuteLabel}</p>
            </div>
            <TeamBadge teamName={match.awayTeam} logoUrl={match.awayLogo} size="xl" />
          </div>
        </div>

        <p className="gp-type-narrative gp-op-hero__narrative">{narrative}</p>

        <div className="gp-op-hero__footer">
          <div className="gp-op-hero__confidence" aria-label={`Confiança ${conf}%`}>
            <div className="gp-op-hero__confidence-track">
              <motion.div
                className="gp-op-hero__confidence-fill"
                initial={{ width: 0 }}
                animate={{ width: `${conf}%` }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
          <Link
            href={`/match/${encodeURIComponent(match.fixtureId)}`}
            className="gp-type-cta gp-op-hero__cta"
          >
            Ver jogo
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </motion.section>
  );
}

export default memo(OperationalHeroInner);
