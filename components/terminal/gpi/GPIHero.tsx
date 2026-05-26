"use client";

import { useMemo } from "react";
import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import TeamBadge from "@/components/matches/TeamBadge";
import { evaluateGpiFromEnriched } from "@/lib/gpi/gpiEvaluate";
import type { GPIClassification } from "@/lib/gpi/gpi.types";
import { resolveTeamLogoFromEnriched } from "@/lib/teams/teamLogoResolver";
import GpiFocusBeacon from "@/components/personalization/GpiFocusBeacon";

const CLASS_MOD: Record<GPIClassification, string> = {
  neutro: "gp-gpi-hero--neutro",
  monitoramento: "gp-gpi-hero--monitor",
  aceleracao: "gp-gpi-hero--accel",
  zona_critica: "gp-gpi-hero--critical",
  ruptura_ofensiva_provavel: "gp-gpi-hero--rupture",
};

export default function GPIHero({ match }: { match: EnrichedLiveMatch }) {
  const gpi = useMemo(() => evaluateGpiFromEnriched(match), [match]);
  const homeLogo = useMemo(() => resolveTeamLogoFromEnriched(match, "home"), [match]);
  const awayLogo = useMemo(() => resolveTeamLogoFromEnriched(match, "away"), [match]);
  const scoreHome = match.scoreKnown ? String(match.homeScore ?? 0) : "—";
  const scoreAway = match.scoreKnown ? String(match.awayScore ?? 0) : "—";

  return (
    <section className={`gp-gpi-hero ${CLASS_MOD[gpi.classification]}`}>
      <GpiFocusBeacon fixtureId={match.fixtureId} gpi={gpi.score} />
      <div className="gp-gpi-hero__brand">
        <span className="gp-gpi-hero__label">GoalPressure Index</span>
        <span className="gp-gpi-hero__fixture">{match.league}</span>
      </div>

      <div className="gp-gpi-hero__faceoff">
        <div className="gp-gpi-hero__faceoff-side">
          <TeamBadge teamName={match.homeTeam} logoUrl={homeLogo} size="lg" />
          <span>{match.homeTeam}</span>
        </div>
        <div className="gp-gpi-hero__faceoff-score">
          <span>
            {scoreHome} × {scoreAway}
          </span>
          <em>{match.minuteLabel}</em>
        </div>
        <div className="gp-gpi-hero__faceoff-side gp-gpi-hero__faceoff-side--away">
          <span>{match.awayTeam}</span>
          <TeamBadge teamName={match.awayTeam} logoUrl={awayLogo} size="lg" />
        </div>
      </div>

      <div className="gp-gpi-hero__core">
        <div className="gp-gpi-hero__score-wrap">
          <span className="gp-gpi-hero__score" aria-label={`GPI ${gpi.score}`}>
            {gpi.score}
          </span>
          <span className="gp-gpi-hero__score-max">/100</span>
        </div>
        <div className="gp-gpi-hero__meta">
          <span className="gp-gpi-hero__class">{gpi.classificationLabel}</span>
          <span className="gp-gpi-hero__intensity">Intensidade · {gpi.intensity}</span>
          <span className="gp-gpi-hero__trend">{gpi.trendLabel}</span>
        </div>
      </div>

      <p className="gp-gpi-hero__narrative">{gpi.narrative}</p>

      <p className="gp-gpi-hero__disclaimer">
        Índice operacional proprietário — leitura contextual, sem promessa de evento.
      </p>
    </section>
  );
}
