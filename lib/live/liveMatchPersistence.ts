/**
 * Live match upsert — Supabase matches table + JSON dual-write safe.
 */

import type { Match } from "@/types/domain";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import type { MatchRow } from "@/lib/supabase/types";
import { logInfo, logWarn } from "@/lib/utils/logger";
import { recordRuntimeOpsLog } from "@/lib/ops/opsStore";

const LOG_SCOPE = "live-match-persistence";

export interface PersistLiveMatchesResult {
  processed: number;
  upserted: number;
  failed: number;
  cloudEnabled: boolean;
}

function mapMatchToRow(match: Match): MatchRow & {
  fixture_id: string;
  last_seen_at: string;
} {
  const externalId = match.externalId ?? match.id.replace(/^sm-/, "") ?? match.id;
  const now = new Date().toISOString();

  return {
    external_id: externalId,
    fixture_id: externalId,
    home_team: match.homeTeam,
    away_team: match.awayTeam,
    league: match.league,
    minute: match.minute,
    pressure_score: match.pressure.score,
    status: match.status ?? "LIVE",
    score: (match.score ?? null) as Record<string, unknown> | null,
    stats: match.stats as unknown as Record<string, unknown>,
    odds: match.odds as unknown as Record<string, unknown>,
    updated_at: now,
    last_seen_at: now,
  };
}

async function upsertMatchCloud(
  row: MatchRow & { fixture_id: string; last_seen_at: string }
): Promise<void> {
  const client = getSupabaseAdmin();
  if (!client) throw new Error("Supabase unavailable");

  const { error } = await client.from("matches").upsert(row, {
    onConflict: "external_id",
  });

  if (error) throw new Error(error.message);
}

/**
 * Upserts live matches by external_id (fixture id).
 */
export async function persistLiveMatches(
  matches: Match[]
): Promise<PersistLiveMatchesResult> {
  const cloudEnabled = isSupabaseConfigured();
  let upserted = 0;
  let failed = 0;

  for (const match of matches) {
    const row = mapMatchToRow(match);

    try {
      if (!cloudEnabled) {
        upserted += 1;
        continue;
      }

      await upsertMatchCloud(row);
      upserted += 1;

      await recordRuntimeOpsLog({
        event: "supabase_upsert_success",
        message: `Match upserted: ${row.external_id}`,
        metadata: { table: "matches", externalId: row.external_id },
      });
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : "Unknown error";
      logWarn(LOG_SCOPE, "Match persist failed", {
        externalId: row.external_id,
        message,
      });
      await recordRuntimeOpsLog({
        event: "supabase_upsert_fail",
        message: `Match upsert failed: ${message}`,
        level: "error",
        metadata: { externalId: row.external_id },
      });
    }
  }

  logInfo(LOG_SCOPE, "Live matches persistence batch", {
    processed: matches.length,
    upserted,
    failed,
    cloudEnabled,
  });

  return {
    processed: matches.length,
    upserted,
    failed,
    cloudEnabled,
  };
}
