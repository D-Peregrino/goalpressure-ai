/**
 * Persistência Supabase — market_edges e market_snapshots.
 */

import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import type { MarketEdgeCalibration } from "@/types/market";
import type { MarketEdgeRow, MarketSnapshotRow } from "@/types/market";
import { logInfo, logOps, logWarn } from "@/lib/utils/logger";

const LOG_SCOPE = "market-persistence";

function calibrationToEdgeRow(cal: MarketEdgeCalibration): MarketEdgeRow {
  return {
    fixture_id: cal.fixtureId,
    market: cal.market,
    proprietary_probability: cal.proprietaryProbability,
    implied_probability: cal.impliedProbability,
    edge: cal.edge,
    edge_percent: cal.edgePercent,
    fair_odd: cal.fairOdd,
    market_odd: cal.marketOdd,
    expected_value: cal.expectedValue,
    confidence: cal.confidence,
    mispricing_score: cal.marketMispricingScore,
    classification: cal.classification,
    closing_line_delta: cal.closingLineDelta ?? null,
    odds_drift: cal.oddsDrift ?? null,
    steam_move: cal.steamMove ?? false,
    metadata: {
      match_id: cal.matchId,
      match_label: cal.matchLabel,
      sharp_pressure: cal.sharpPressure,
      computed_at: cal.computedAt,
    },
  };
}

function calibrationToSnapshotRow(
  cal: MarketEdgeCalibration,
  snapshotType: "live_cycle" | "closing" | "steam"
): MarketSnapshotRow {
  return {
    fixture_id: cal.fixtureId,
    market: cal.market,
    snapshot_type: snapshotType,
    market_odd: cal.marketOdd,
    proprietary_probability: cal.proprietaryProbability,
    implied_probability: cal.impliedProbability,
    edge: cal.edge,
    expected_value: cal.expectedValue,
    mispricing_score: cal.marketMispricingScore,
    closing_line_delta: cal.closingLineDelta ?? null,
    odds_drift: cal.oddsDrift ?? null,
    steam_move: cal.steamMove ?? false,
    sharp_pressure: cal.sharpPressure ?? null,
    metadata: {
      classification: cal.classification,
      match_label: cal.matchLabel,
      edge_percent: cal.edgePercent,
      fair_odd: cal.fairOdd,
    },
  };
}

async function insertEdge(row: MarketEdgeRow): Promise<void> {
  const client = getSupabaseAdmin();
  if (!client) throw new Error("Supabase unavailable");
  const { error } = await client.from("market_edges").insert(row);
  if (error) throw new Error(error.message);
}

async function insertSnapshot(row: MarketSnapshotRow): Promise<void> {
  const client = getSupabaseAdmin();
  if (!client) throw new Error("Supabase unavailable");
  const { error } = await client.from("market_snapshots").insert(row);
  if (error) throw new Error(error.message);
}

export interface PersistMarketCalibrationResult {
  edgesPersisted: number;
  snapshotsPersisted: number;
  failed: number;
}

export async function persistMarketCalibrationBatch(
  calibrations: MarketEdgeCalibration[]
): Promise<PersistMarketCalibrationResult> {
  let edgesPersisted = 0;
  let snapshotsPersisted = 0;
  let failed = 0;

  if (!isSupabaseConfigured()) {
    return {
      edgesPersisted: calibrations.length,
      snapshotsPersisted: calibrations.length,
      failed: 0,
    };
  }

  for (const cal of calibrations) {
    try {
      await insertEdge(calibrationToEdgeRow(cal));
      edgesPersisted += 1;

      const snapType = cal.steamMove
        ? "steam"
        : (cal.minute ?? 0) >= 80
          ? "closing"
          : "live_cycle";

      await insertSnapshot(
        calibrationToSnapshotRow(cal, snapType as "live_cycle" | "closing" | "steam")
      );
      snapshotsPersisted += 1;
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : "Unknown";
      logWarn(LOG_SCOPE, "market persist failed", {
        fixtureId: cal.fixtureId,
        message,
      });
    }
  }

  logInfo(LOG_SCOPE, "Market calibration batch", {
    edgesPersisted,
    snapshotsPersisted,
    failed,
  });

  if (edgesPersisted > 0) {
    logOps(LOG_SCOPE, `[market-calibration] persisted ${edgesPersisted} edges`);
  }

  return { edgesPersisted, snapshotsPersisted, failed };
}

export interface FetchMarketEdgesOptions {
  limit?: number;
  fixtureId?: string;
  classification?: string;
}

export async function fetchRecentMarketEdges(
  options: FetchMarketEdgesOptions = {}
): Promise<MarketEdgeRow[]> {
  if (!isSupabaseConfigured()) return [];

  const client = getSupabaseAdmin();
  if (!client) return [];

  let query = client
    .from("market_edges")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 50);

  if (options.fixtureId) {
    query = query.eq("fixture_id", options.fixtureId);
  }
  if (options.classification) {
    query = query.eq("classification", options.classification);
  }

  const { data, error } = await query;
  if (error) {
    logWarn(LOG_SCOPE, "fetch market_edges failed", { message: error.message });
    return [];
  }

  return (data ?? []) as MarketEdgeRow[];
}
