/**
 * SportMonks fixture → dados de card ao vivo (sem inventar stats).
 */
import type { SportmonksFixture } from "@/lib/mappers/sportmonks";
import { mapSportmonksFixtureToMatch } from "@/lib/mappers/sportmonks";
import { isLiveStatus } from "@/lib/ui/matchFormatting";
import type { Match } from "@/types/domain";

export type MatchCardView = {
  id: string;
  externalId: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  minute: number;
  status: string;
  score: { home: number; away: number } | null;
  pressureScore: number;
  statsAvailable: boolean;
  statsPendingLabel: string | null;
  updatedAt: number;
};

export function sportmonksFixtureToMatchCard(fixture: SportmonksFixture): MatchCardView {
  const match: Match = mapSportmonksFixtureToMatch(fixture);
  const hasStats =
    Boolean(match.feedMeta?.hasStatistics) ||
    (match.stats.shots > 0 ||
      match.stats.dangerousAttacks > 0 ||
      match.stats.corners > 0);

  const isLive = isLiveStatus(match.status);

  return {
    id: match.id,
    externalId: match.externalId ?? match.id,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    league: match.league,
    minute: match.minute,
    status: match.status ?? "UNKNOWN",
    score: match.score ?? null,
    pressureScore: match.pressure.score,
    statsAvailable: hasStats,
    statsPendingLabel:
      isLive && !hasStats ? "Aguardando estatísticas live" : null,
    updatedAt: match.updatedAt ?? Date.now(),
  };
}

export function sportmonksFixturesToMatchCards(
  fixtures: SportmonksFixture[]
): MatchCardView[] {
  return fixtures.map(sportmonksFixtureToMatchCard);
}
