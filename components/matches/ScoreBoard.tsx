"use client";

import { formatScoreDisplay } from "@/lib/ui/normalizeLiveMatch";
import TeamBadge from "@/components/matches/TeamBadge";

export default function ScoreBoard({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  scoreKnown,
  homeLogo,
  awayLogo,
}: {
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  scoreKnown: boolean;
  homeLogo?: string | null;
  awayLogo?: string | null;
}) {
  const score = formatScoreDisplay(homeScore, awayScore, scoreKnown);

  return (
    <div className="match-card__score-row">
      <div className="match-card__team-col match-card__team-col--home">
        <TeamBadge teamName={homeTeam} logoUrl={homeLogo} size="lg" />
        <span className="match-card__team-name" title={homeTeam}>
          {homeTeam}
        </span>
      </div>
      <div className="match-card__score-center font-display">
        <span>{score.home}</span>
        <span className="mx-2 text-[var(--muted)] font-normal">:</span>
        <span>{score.away}</span>
      </div>
      <div className="match-card__team-col">
        <TeamBadge teamName={awayTeam} logoUrl={awayLogo} size="lg" />
        <span className="match-card__team-name" title={awayTeam}>
          {awayTeam}
        </span>
      </div>
    </div>
  );
}
