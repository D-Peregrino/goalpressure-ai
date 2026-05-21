/**
 * Persistência Supabase — player_runtime_metrics.
 */

import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import type { PlayerImpactResult, PlayerRuntimeMetricsRow } from "@/types/player";
import { logInfo, logOps, logWarn } from "@/lib/utils/logger";

const LOG_SCOPE = "player-persistence";

function toRow(result: PlayerImpactResult): PlayerRuntimeMetricsRow {
  return {
    fixture_id: result.fixtureId,
    minute: result.minute,
    offensive_impact: result.offensiveImpact,
    defensive_impact: result.defensiveImpact,
    chaos_contribution: result.chaosContribution,
    fatigue_impact: result.fatigueImpact,
    clutch_factor: result.clutchFactor,
    goalkeeper_resistance: result.goalkeeperResistance,
    substitution_swing: result.substitutionSwing,
    red_card_impact: result.redCardImpact,
    player_volatility: result.playerVolatility,
    team_synergy_shift: result.teamSynergyShift,
    metadata: {
      match_id: result.matchId,
      match_label: result.matchLabel,
      flags: result.flags,
      top_clutch: result.topClutchPlayer,
      top_fatigue: result.topFatigueAlert,
      top_chaos: result.topChaosContributor,
      computed_at: result.computedAt,
    },
  };
}

export async function persistPlayerRuntimeMetric(
  result: PlayerImpactResult
): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;

  const client = getSupabaseAdmin();
  if (!client) return false;

  try {
    const { error } = await client
      .from("player_runtime_metrics")
      .insert(toRow(result));
    if (error) throw new Error(error.message);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown";
    logWarn(LOG_SCOPE, "player_runtime_metrics insert failed", {
      fixtureId: result.fixtureId,
      message,
    });
    return false;
  }
}

export async function persistPlayerRuntimeMetricsBatch(
  results: PlayerImpactResult[]
): Promise<{ persisted: number; failed: number }> {
  let persisted = 0;
  let failed = 0;

  for (const r of results) {
    const ok = await persistPlayerRuntimeMetric(r);
    if (ok) persisted += 1;
    else failed += 1;
  }

  logInfo(LOG_SCOPE, "Player runtime batch", {
    processed: results.length,
    persisted,
    failed,
  });

  if (persisted > 0) {
    logOps(LOG_SCOPE, `[player-impact] persisted ${persisted} rows`);
  }

  return { persisted, failed };
}

export async function fetchRecentPlayerRuntimeMetrics(
  limit = 50
): Promise<PlayerRuntimeMetricsRow[]> {
  if (!isSupabaseConfigured()) return [];

  const client = getSupabaseAdmin();
  if (!client) return [];

  const { data, error } = await client
    .from("player_runtime_metrics")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logWarn(LOG_SCOPE, "fetch player_runtime_metrics failed", {
      message: error.message,
    });
    return [];
  }

  return (data ?? []) as PlayerRuntimeMetricsRow[];
}
