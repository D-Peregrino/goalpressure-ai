/**
 * Persistência Supabase — tabela live_metrics (pressure casa/fora por fixture).
 */

import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import type { LiveMetricsRow } from "@/lib/supabase/types";
import type { LiveMetricRecord } from "@/lib/runtime/liveRuntime";
import { logInfo, logWarn } from "@/lib/utils/logger";
import { recordRuntimeOpsLog } from "@/lib/ops/opsStore";

const LOG_SCOPE = "live-metrics-persistence";

export interface PersistLiveMetricsResult {
  processed: number;
  persisted: number;
  failed: number;
  cloudEnabled: boolean;
}

function mapRecordToRow(record: LiveMetricRecord): LiveMetricsRow {
  return {
    fixture_id: record.fixtureId,
    home_pressure: record.homePressure,
    away_pressure: record.awayPressure,
    momentum: record.momentum,
    goal_probability: record.goalProbability,
    confidence: record.confidence,
    metadata: {
      match_id: record.matchId,
      match_label: record.matchLabel,
      minute: record.minute,
      pressure_score: record.pressureScore,
      offensive_intensity: record.offensiveIntensity,
      source: "live_runtime",
      computed_at: record.computedAt,
    },
  };
}

async function insertMetricRow(row: LiveMetricsRow): Promise<void> {
  const client = getSupabaseAdmin();
  if (!client) throw new Error("Supabase unavailable");

  const { error } = await client.from("live_metrics").insert(row);

  if (error) throw new Error(error.message);
}

/**
 * Insere uma linha de métricas por fixture por ciclo (histórico temporal).
 */
export async function persistLiveMetrics(
  records: LiveMetricRecord[]
): Promise<PersistLiveMetricsResult> {
  const cloudEnabled = isSupabaseConfigured();
  let persisted = 0;
  let failed = 0;

  for (const record of records) {
    const row = mapRecordToRow(record);

    try {
      if (!cloudEnabled) {
        persisted += 1;
        continue;
      }

      await insertMetricRow(row);
      persisted += 1;
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : "Unknown error";
      logWarn(LOG_SCOPE, "live_metrics insert failed", {
        fixtureId: row.fixture_id,
        message,
      });
      await recordRuntimeOpsLog({
        event: "live_metrics_fail",
        message: `live_metrics insert failed: ${message}`,
        level: "warn",
        metadata: { fixtureId: row.fixture_id },
      });
    }
  }

  if (persisted > 0 && cloudEnabled) {
    await recordRuntimeOpsLog({
      event: "live_metrics_saved",
      message: `live_metrics: ${persisted}/${records.length} rows`,
      metadata: { persisted, failed },
    });
  }

  logInfo(LOG_SCOPE, "Live metrics batch", {
    processed: records.length,
    persisted,
    failed,
    cloudEnabled,
  });

  return {
    processed: records.length,
    persisted,
    failed,
    cloudEnabled,
  };
}
