import type { Match, MatchScore } from "@/types/domain";
import { batchUpsertIgnoreDuplicates } from "@/lib/persistence/persistenceBatch";
import { getPersistenceConfig } from "@/lib/persistence/persistenceConfig";
import { shouldPersistFixtureMinute } from "@/lib/persistence/persistenceThrottle";

const FINISHED = new Set(["FINISHED", "FT", "AET", "CANCELLED", "POSTPONED"]);

function fixtureId(match: Match): string {
  return match.externalId ?? match.id.replace(/^sm-/, "") ?? match.id;
}

function scoreLabel(score: MatchScore): string {
  return `${score.home}-${score.away}`;
}

export function buildMatchOutcomeRows(matches: Match[]): Record<string, unknown>[] {
  const config = getPersistenceConfig();
  const rows: Record<string, unknown>[] = [];

  for (const match of matches) {
    if (!match.status || !FINISHED.has(match.status)) continue;
    if (!match.score) continue;

    const fid = fixtureId(match);
    if (!shouldPersistFixtureMinute("outcome", fid, 90, config.fixtureMinIntervalMs)) {
      continue;
    }

    rows.push({
      fixture_id: fid,
      league: match.league ?? null,
      home_team: match.homeTeam ?? null,
      away_team: match.awayTeam ?? null,
      final_score: scoreLabel(match.score),
      goals_total: match.score.home + match.score.away,
      finished_at: new Date().toISOString(),
      outcome_source: "live_pipeline",
      metadata_json: {
        status: match.status,
        minute: match.minute ?? 90,
      },
    });
  }

  return rows;
}

export async function persistMatchOutcomes(matches: Match[]): Promise<number> {
  const config = getPersistenceConfig();
  if (config.sandbox) return 0;

  const rows = buildMatchOutcomeRows(matches);
  return batchUpsertIgnoreDuplicates(
    "match_outcomes",
    rows,
    "fixture_id",
    config.batchSize
  );
}
