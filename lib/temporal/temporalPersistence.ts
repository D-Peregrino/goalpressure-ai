/**
 * Persistência Supabase — temporal_metrics.
 */

import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import type { TemporalDynamicsResult, TemporalMetricsRow } from "@/types/temporal";
import { logInfo, logOps, logWarn } from "@/lib/utils/logger";

const LOG_SCOPE = "temporal-persistence";

function toRow(result: TemporalDynamicsResult): TemporalMetricsRow {
  return {
    fixture_id: result.fixtureId,
    minute: result.minute,
    match_phase: result.matchPhase,
    temporal_pressure: result.temporalPressure,
    urgency_multiplier: result.urgencyMultiplier,
    scoring_window_probability: result.scoringWindowProbability,
    late_goal_probability: result.lateGoalProbability,
    exhaustion_factor: result.exhaustionFactor,
    chaos_index: result.chaosIndex,
    market_lag_factor: result.marketLagFactor,
    acceleration_score: result.accelerationScore,
    volatility_score: result.volatilityScore,
    execution_priority: result.executionPriority,
    metadata: {
      match_id: result.matchId,
      match_label: result.matchLabel,
      flags: result.flags,
      computed_at: result.computedAt,
    },
  };
}

export async function persistTemporalMetric(
  result: TemporalDynamicsResult
): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;

  const client = getSupabaseAdmin();
  if (!client) return false;

  try {
    const { error } = await client.from("temporal_metrics").insert(toRow(result));
    if (error) throw new Error(error.message);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown";
    logWarn(LOG_SCOPE, "temporal_metrics insert failed", {
      fixtureId: result.fixtureId,
      message,
    });
    return false;
  }
}

export async function persistTemporalMetricsBatch(
  results: TemporalDynamicsResult[]
): Promise<{ persisted: number; failed: number }> {
  let persisted = 0;
  let failed = 0;

  for (const r of results) {
    const ok = await persistTemporalMetric(r);
    if (ok) persisted += 1;
    else failed += 1;
  }

  logInfo(LOG_SCOPE, "Temporal metrics batch", {
    processed: results.length,
    persisted,
    failed,
  });

  if (persisted > 0) {
    logOps(LOG_SCOPE, `[temporal-dynamics] persisted ${persisted} rows`);
  }

  return { persisted, failed };
}

export async function fetchRecentTemporalMetrics(
  limit = 50
): Promise<TemporalMetricsRow[]> {
  if (!isSupabaseConfigured()) return [];

  const client = getSupabaseAdmin();
  if (!client) return [];

  const { data, error } = await client
    .from("temporal_metrics")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logWarn(LOG_SCOPE, "fetch temporal_metrics failed", {
      message: error.message,
    });
    return [];
  }

  return (data ?? []) as TemporalMetricsRow[];
}
