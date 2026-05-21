/**
 * Persistência Supabase — data_quality_metrics.
 */

import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import type { DataQualityResult, DataQualityMetricsRow } from "@/types/dataQuality";
import { logInfo, logOps, logWarn } from "@/lib/utils/logger";

const LOG_SCOPE = "data-quality-persistence";

function toRow(result: DataQualityResult): DataQualityMetricsRow {
  return {
    fixture_id: result.fixtureId,
    minute: result.minute,
    data_quality_score: result.dataQualityScore,
    missing_fields: result.missingFields,
    stale_risk: result.staleRisk,
    reliability: result.reliability,
    usable_for_signal: result.usableForSignal,
    metadata: {
      match_id: result.matchId,
      match_label: result.matchLabel,
      flags: result.flags,
      computed_at: result.computedAt,
    },
  };
}

export async function persistDataQualityMetric(
  result: DataQualityResult
): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;

  const client = getSupabaseAdmin();
  if (!client) return false;

  try {
    const { error } = await client.from("data_quality_metrics").insert(toRow(result));
    if (error) throw new Error(error.message);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown";
    logWarn(LOG_SCOPE, "data_quality_metrics insert failed", {
      fixtureId: result.fixtureId,
      message,
    });
    return false;
  }
}

export async function persistDataQualityMetricsBatch(
  results: DataQualityResult[]
): Promise<{ persisted: number; failed: number }> {
  let persisted = 0;
  let failed = 0;

  for (const r of results) {
    const ok = await persistDataQualityMetric(r);
    if (ok) persisted += 1;
    else failed += 1;
  }

  logInfo(LOG_SCOPE, "Data quality batch", {
    processed: results.length,
    persisted,
    failed,
  });

  if (persisted > 0) {
    logOps(LOG_SCOPE, `[data-quality] persisted ${persisted} rows`);
  }

  return { persisted, failed };
}

export async function fetchRecentDataQualityMetrics(
  limit = 50
): Promise<DataQualityMetricsRow[]> {
  if (!isSupabaseConfigured()) return [];

  const client = getSupabaseAdmin();
  if (!client) return [];

  const { data, error } = await client
    .from("data_quality_metrics")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logWarn(LOG_SCOPE, "fetch data_quality_metrics failed", { message: error.message });
    return [];
  }

  return (data ?? []) as DataQualityMetricsRow[];
}
