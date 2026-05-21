/**
 * Persistência Supabase — validation_metrics + validation_snapshots.
 */

import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import type {
  LiveValidationResult,
  ValidationLabSnapshot,
  ValidationMetricsRow,
  ValidationSnapshotRow,
} from "@/types/validation";
import { logInfo, logOps, logWarn } from "@/lib/utils/logger";

const LOG_SCOPE = "validation-persistence";

function toMetricsRow(result: LiveValidationResult): ValidationMetricsRow {
  return {
    fixture_id: result.fixtureId,
    minute: result.minute,
    validation_score: result.validationScore,
    false_positive_risk: result.falsePositiveRisk,
    reliability: result.reliability,
    segment_tags: result.segmentTags,
    metadata: {
      match_id: result.matchId,
      match_label: result.matchLabel,
      flags: result.flags,
      usable_for_calibration: result.usableForCalibration,
      computed_at: result.computedAt,
    },
  };
}

export async function persistValidationMetric(
  result: LiveValidationResult
): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;

  const client = getSupabaseAdmin();
  if (!client) return false;

  try {
    const { error } = await client
      .from("validation_metrics")
      .insert(toMetricsRow(result));
    if (error) throw new Error(error.message);
    return true;
  } catch (error) {
    logWarn(LOG_SCOPE, "validation_metrics insert failed", {
      fixtureId: result.fixtureId,
      message: error instanceof Error ? error.message : "unknown",
    });
    return false;
  }
}

export async function persistValidationMetricsBatch(
  results: LiveValidationResult[]
): Promise<{ persisted: number; failed: number }> {
  let persisted = 0;
  let failed = 0;

  for (const r of results) {
    const ok = await persistValidationMetric(r);
    if (ok) persisted += 1;
    else failed += 1;
  }

  if (persisted > 0) {
    logOps(LOG_SCOPE, `[live-validation] persisted ${persisted} validation_metrics`);
  }

  return { persisted, failed };
}

export async function persistValidationSnapshot(
  lab: ValidationLabSnapshot,
  snapshotType: "live_cycle" | "historical_refresh" = "live_cycle"
): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;

  const client = getSupabaseAdmin();
  if (!client) return false;

  const row: ValidationSnapshotRow = {
    snapshot_type: snapshotType,
    trade_count: lab.tradeCount,
    hit_rate: lab.hitRate,
    roi: lab.roi,
    profit_units: lab.profitUnits,
    lab_payload: lab,
    suggestions: lab.calibrationSuggestions,
  };

  try {
    const { error } = await client.from("validation_snapshots").insert({
      snapshot_type: row.snapshot_type,
      trade_count: row.trade_count,
      hit_rate: row.hit_rate,
      roi: row.roi,
      profit_units: row.profit_units,
      lab_payload: row.lab_payload,
      suggestions: row.suggestions,
      created_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    logInfo(LOG_SCOPE, "[live-validation] validation_snapshots saved", {
      trades: lab.tradeCount,
      suggestions: lab.calibrationSuggestions.length,
    });
    return true;
  } catch (error) {
    logWarn(LOG_SCOPE, "validation_snapshots insert failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return false;
  }
}

export async function fetchRecentValidationMetrics(
  limit = 50
): Promise<ValidationMetricsRow[]> {
  if (!isSupabaseConfigured()) return [];

  const client = getSupabaseAdmin();
  if (!client) return [];

  const { data, error } = await client
    .from("validation_metrics")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logWarn(LOG_SCOPE, "fetch validation_metrics failed", { message: error.message });
    return [];
  }

  return (data ?? []) as ValidationMetricsRow[];
}

export async function fetchLatestValidationSnapshot(): Promise<ValidationSnapshotRow | null> {
  if (!isSupabaseConfigured()) return null;

  const client = getSupabaseAdmin();
  if (!client) return null;

  const { data, error } = await client
    .from("validation_snapshots")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as ValidationSnapshotRow;
}

export interface TelegramDispatchStats {
  sent: number;
  queued: number;
  blocked: number;
  skipped: number;
  error: number;
  conversionRate: number;
}

export async function fetchTelegramDispatchStats(): Promise<TelegramDispatchStats> {
  const empty: TelegramDispatchStats = {
    sent: 0,
    queued: 0,
    blocked: 0,
    skipped: 0,
    error: 0,
    conversionRate: 0,
  };

  if (!isSupabaseConfigured()) return empty;

  const client = getSupabaseAdmin();
  if (!client) return empty;

  try {
    const { data, error } = await client
      .from("telegram_dispatches")
      .select("status")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error || !data) return empty;

    let queued = 0;
    let blocked = 0;
    let skipped = 0;
    let errorCount = 0;
    let sent = 0;

    for (const row of data) {
      const status = String((row as { status: string }).status);
      if (status === "queued") queued += 1;
      else if (status === "blocked") blocked += 1;
      else if (status === "skipped") skipped += 1;
      else if (status === "error") errorCount += 1;
      else if (status === "sent") sent += 1;
    }

    const total = queued + blocked + skipped + errorCount + sent;
    return {
      sent,
      queued,
      blocked,
      skipped,
      error: errorCount,
      conversionRate: total > 0 ? queued / total : 0,
    };
  } catch {
    return empty;
  }
}
