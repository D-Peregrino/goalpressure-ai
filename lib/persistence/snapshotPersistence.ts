import type { Match } from "@/types/domain";
import { batchUpsertIgnoreDuplicates } from "@/lib/persistence/persistenceBatch";
import { getPersistenceConfig } from "@/lib/persistence/persistenceConfig";
import { shouldPersistFixtureMinute } from "@/lib/persistence/persistenceThrottle";

function fixtureId(match: Match): string {
  return match.externalId ?? match.id.replace(/^sm-/, "") ?? match.id;
}

function isLive(match: Match): boolean {
  return match.status === "LIVE" || match.status === "HALFTIME";
}

export function buildLiveMatchSnapshotRows(matches: Match[]): Record<string, unknown>[] {
  const config = getPersistenceConfig();
  const rows: Record<string, unknown>[] = [];

  for (const match of matches) {
    if (!isLive(match)) continue;
    const fid = fixtureId(match);
    const minute = Math.max(0, match.minute ?? 0);
    if (
      !shouldPersistFixtureMinute("snapshot", fid, minute, config.fixtureMinIntervalMs)
    ) {
      continue;
    }

    const offensive = match.feedMeta?.offensiveEngine;
    rows.push({
      fixture_id: fid,
      minute,
      league: match.league ?? null,
      home_team: match.homeTeam ?? null,
      away_team: match.awayTeam ?? null,
      status: match.status,
      pressure_score: match.pressure?.score ?? 0,
      momentum_score:
        offensive?.momentumScore ?? match.premium?.momentumScore ?? 0,
      score_json: match.score ?? {},
      stats_json: match.stats ?? {},
      metadata_json: {
        chaosIndex: match.chaosIndex ?? null,
        acceleration: offensive?.accelerationScore ?? null,
        territorial: offensive?.territorialScore ?? null,
        sportmonksSources: match.premium?.feedSources ?? match.feedMeta?.sportmonksSources ?? null,
        momentumDirection: match.premium?.momentumDirection ?? null,
        commentaryCount: match.premium?.commentaryCount ?? 0,
        timelineEventsCount: match.premium?.timelineEventsCount ?? 0,
        xgHome: match.premium?.xgHome ?? null,
        xgAway: match.premium?.xgAway ?? null,
        advancedOddsCount: match.premium?.advancedOddsCount ?? 0,
      },
    });
  }

  return rows;
}

export async function persistLiveMatchSnapshots(matches: Match[]): Promise<number> {
  const config = getPersistenceConfig();
  if (config.sandbox) return 0;

  const rows = buildLiveMatchSnapshotRows(matches);
  return batchUpsertIgnoreDuplicates(
    "live_match_snapshots",
    rows,
    "fixture_id,minute",
    config.batchSize
  );
}
