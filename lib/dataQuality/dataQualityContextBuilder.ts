/**
 * Constrói input de data quality a partir de Match live.
 */

import type { Match } from "@/types/domain";
import type { DataQualityInput } from "@/types/dataQuality";

const seenFixtures = new Set<string>();

export function resetDataQualityFixtureRegistry(): void {
  seenFixtures.clear();
}

export function buildDataQualityInput(
  match: Match,
  apiDelayMs?: number
): DataQualityInput {
  const fixtureId = match.externalId ?? match.id.replace(/^sm-/, "");
  const duplicateFixture = seenFixtures.has(fixtureId);
  seenFixtures.add(fixtureId);

  const now = Date.now();
  const staleAgeMs =
    match.updatedAt != null ? now - match.updatedAt : undefined;

  const home = match.score?.home ?? 0;
  const away = match.score?.away ?? 0;
  const scoreConsistent =
    match.score == null ||
    (home >= 0 && away >= 0 && home + away <= match.minute / 2 + 10);

  return {
    fixtureId,
    matchId: match.id,
    matchLabel: `${match.homeTeam} vs ${match.awayTeam}`,
    minute: match.minute,
    hasMinute: match.minute > 0,
    hasOdds: match.odds.over05 > 1 && match.odds.over15 > 1,
    hasStats:
      match.stats.shots > 0 ||
      match.stats.dangerousAttacks > 0 ||
      match.stats.corners > 0,
    hasXG: (match.stats.xG ?? 0) > 0,
    shots: match.stats.shots,
    dangerousAttacks: match.stats.dangerousAttacks,
    corners: match.stats.corners,
    possession: match.stats.possession,
    scoreConsistent,
    duplicateFixture,
    apiDelayMs,
    staleAgeMs,
    updatedAt: match.updatedAt,
  };
}
