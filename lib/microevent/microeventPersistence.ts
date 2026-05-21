/**
 * Persistência Supabase — microevent_metrics.
 */

import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import type {
  MicroeventDetectionResult,
  MicroeventMetricsRow,
} from "@/types/microevent";
import { logInfo, logOps, logWarn } from "@/lib/utils/logger";

const LOG_SCOPE = "microevent-persistence";

function toRow(result: MicroeventDetectionResult): MicroeventMetricsRow {
  return {
    fixture_id: result.fixtureId,
    minute: result.minute,
    territorial_dominance: result.territorialDominance,
    sequence_pressure: result.sequencePressure,
    attack_wave_intensity: result.attackWaveIntensity,
    chaos_burst: result.chaosBurst,
    transition_threat: result.transitionThreat,
    flank_overload: result.flankOverload,
    counter_attack_risk: result.counterAttackRisk,
    set_piece_danger: result.setPieceDanger,
    emotional_tilt: result.emotionalTilt,
    collapse_probability: result.collapseProbability,
    microevent_score: result.microeventScore,
    trigger_window: result.triggerWindow,
    metadata: {
      match_id: result.matchId,
      match_label: result.matchLabel,
      flags: result.flags,
      computed_at: result.computedAt,
    },
  };
}

export async function persistMicroeventMetric(
  result: MicroeventDetectionResult
): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;

  const client = getSupabaseAdmin();
  if (!client) return false;

  try {
    const { error } = await client.from("microevent_metrics").insert(toRow(result));
    if (error) throw new Error(error.message);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown";
    logWarn(LOG_SCOPE, "microevent_metrics insert failed", {
      fixtureId: result.fixtureId,
      message,
    });
    return false;
  }
}

export async function persistMicroeventMetricsBatch(
  results: MicroeventDetectionResult[]
): Promise<{ persisted: number; failed: number }> {
  let persisted = 0;
  let failed = 0;

  for (const r of results) {
    const ok = await persistMicroeventMetric(r);
    if (ok) persisted += 1;
    else failed += 1;
  }

  logInfo(LOG_SCOPE, "Microevent batch", {
    processed: results.length,
    persisted,
    failed,
  });

  if (persisted > 0) {
    logOps(LOG_SCOPE, `[microevent-engine] persisted ${persisted} rows`);
  }

  return { persisted, failed };
}

export async function fetchRecentMicroeventMetrics(
  limit = 50
): Promise<MicroeventMetricsRow[]> {
  if (!isSupabaseConfigured()) return [];

  const client = getSupabaseAdmin();
  if (!client) return [];

  const { data, error } = await client
    .from("microevent_metrics")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logWarn(LOG_SCOPE, "fetch microevent_metrics failed", {
      message: error.message,
    });
    return [];
  }

  return (data ?? []) as MicroeventMetricsRow[];
}
