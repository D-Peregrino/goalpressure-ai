import type { Match } from "@/types/domain";
import type {
  HistoricalEdgeResult,
  HistoricalSignalOutcome,
  LeagueBehaviorProfile,
  LearningBadge,
  RecurringPattern,
  TeamBehaviorProfile,
} from "@/lib/engine/learning/learning.types";
import { calculateSignalAccuracy } from "@/lib/engine/learning/calculateSignalAccuracy";

function clamp(v: number): number {
  return Math.min(100, Math.max(0, Math.round(v)));
}

/**
 * Historical Edge Score — mistura ROI, accuracy, contexto e pressão.
 */
export function calculateHistoricalEdge(
  match: Match,
  context: {
    outcomes: HistoricalSignalOutcome[];
    leagueProfile?: LeagueBehaviorProfile | null;
    teamProfiles?: TeamBehaviorProfile[];
    patterns?: RecurringPattern[];
  }
): HistoricalEdgeResult {
  const league = match.league;
  const home = match.homeTeam;
  const away = match.awayTeam;
  const pressure = match.pressure.score;
  const ev = match.evEngine?.expectedValue.best?.evPercent ?? 0;

  const leagueRows = context.outcomes.filter((o) => o.league === league);
  const teamRows = context.outcomes.filter(
    (o) => o.homeTeam === home || o.awayTeam === away || o.homeTeam === away || o.awayTeam === home
  );

  const accLeague =
    leagueRows.length >= 2
      ? calculateSignalAccuracy(leagueRows)
      : calculateSignalAccuracy(context.outcomes);
  const accTeam =
    teamRows.length >= 2 ? calculateSignalAccuracy(teamRows) : accLeague;

  const roiHistory = clamp(
    (accLeague.roiAverage + 1) * 35 + accLeague.hitRate * 0.35
  );
  const accuracy = clamp(accTeam.hitRate * 0.9 + accLeague.hitRate * 0.1);
  const pressureAlign = clamp(
    pressure * 0.5 +
      (context.leagueProfile?.pressureReliability ?? 50) * 0.3
  );
  const evRealized = clamp(
    Math.max(0, ev) * 2 + accLeague.realizedEvAverage * 0.4
  );

  let score = clamp(
    roiHistory * 0.3 + accuracy * 0.35 + pressureAlign * 0.2 + evRealized * 0.15
  );

  const badges: LearningBadge[] = [];

  if (score >= 62) badges.push("HIGH_HISTORICAL_EDGE");
  if (context.leagueProfile && context.leagueProfile.conversionScore >= 55) {
    badges.push("LEAGUE_FAVORABLE");
    score = clamp(score + 6);
  }
  const teamHit = (context.teamProfiles ?? []).filter(
    (t) => t.team === home || t.team === away
  );
  if (teamHit.length > 0) badges.push("TEAM_PROFILE_DETECTED");
  const leaguePatterns = (context.patterns ?? []).filter(
    (p) => !p.league || p.league === league
  );
  if (leaguePatterns.length > 0) badges.push("HISTORICAL_PATTERN");

  let label = "Edge histórico neutro";
  if (score >= 75) label = "Edge histórico forte";
  else if (score >= 55) label = "Edge histórico favorável";
  else if (score < 35) label = "Edge histórico fraco";

  return {
    score,
    label,
    factors: {
      roiHistory,
      accuracy,
      pressureAlign,
      evRealized,
    },
    badges,
  };
}
