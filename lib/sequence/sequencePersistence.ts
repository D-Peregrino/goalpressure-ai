/**
 * Persistência Supabase — sequence_memory_metrics.
 */

import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import type {
  SequenceMemoryResult,
  SequenceMemoryMetricsRow,
} from "@/types/sequence";
import { logInfo, logOps, logWarn } from "@/lib/utils/logger";

const LOG_SCOPE = "sequence-persistence";

function toRow(result: SequenceMemoryResult): SequenceMemoryMetricsRow {
  return {
    fixture_id: result.fixtureId,
    minute: result.minute,
    recurring_pressure_pattern: result.recurringPressurePattern,
    pressure_persistence: result.pressurePersistence,
    offensive_cycle_strength: result.offensiveCycleStrength,
    collapse_cycle_probability: result.collapseCycleProbability,
    emotional_recovery_index: result.emotionalRecoveryIndex,
    fake_momentum_probability: result.fakeMomentumProbability,
    sustained_chaos_level: result.sustainedChaosLevel,
    defensive_fatigue_curve: result.defensiveFatigueCurve,
    late_game_dominance: result.lateGameDominance,
    recurrence_score: result.recurrenceScore,
    memory_confidence: result.memoryConfidence,
    sequence_state: result.sequenceState,
    metadata: {
      match_id: result.matchId,
      match_label: result.matchLabel,
      flags: result.flags,
      computed_at: result.computedAt,
    },
  };
}

export async function persistSequenceMemoryMetric(
  result: SequenceMemoryResult
): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;

  const client = getSupabaseAdmin();
  if (!client) return false;

  try {
    const { error } = await client
      .from("sequence_memory_metrics")
      .insert(toRow(result));
    if (error) throw new Error(error.message);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown";
    logWarn(LOG_SCOPE, "sequence_memory_metrics insert failed", {
      fixtureId: result.fixtureId,
      message,
    });
    return false;
  }
}

export async function persistSequenceMemoryMetricsBatch(
  results: SequenceMemoryResult[]
): Promise<{ persisted: number; failed: number }> {
  let persisted = 0;
  let failed = 0;

  for (const r of results) {
    const ok = await persistSequenceMemoryMetric(r);
    if (ok) persisted += 1;
    else failed += 1;
  }

  logInfo(LOG_SCOPE, "Sequence memory batch", {
    processed: results.length,
    persisted,
    failed,
  });

  if (persisted > 0) {
    logOps(LOG_SCOPE, `[sequence-memory] persisted ${persisted} rows`);
  }

  return { persisted, failed };
}

export async function fetchRecentSequenceMemoryMetrics(
  limit = 50
): Promise<SequenceMemoryMetricsRow[]> {
  if (!isSupabaseConfigured()) return [];

  const client = getSupabaseAdmin();
  if (!client) return [];

  const { data, error } = await client
    .from("sequence_memory_metrics")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logWarn(LOG_SCOPE, "fetch sequence_memory_metrics failed", {
      message: error.message,
    });
    return [];
  }

  return (data ?? []) as SequenceMemoryMetricsRow[];
}
