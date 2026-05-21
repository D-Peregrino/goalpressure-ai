/**
 * Snapshot in-memory do último ciclo de calibração — /ops e /api/market/edges.
 */

import type { MarketEdgeCalibration } from "@/types/market";
import type { MarketEdgeRow } from "@/types/market";

export interface MarketCalibrationOpsSnapshot {
  updatedAt: string | null;
  calibrated: number;
  averageEdge: number;
  strongestEdge: MarketEdgeCalibration | null;
  closingLineEfficiency: number;
  marketDrift: number;
  sharpPressure: number;
  steamMoves: number;
  edges: MarketEdgeCalibration[];
  byClassification: Record<string, number>;
}

interface GlobalMarketSlot {
  snapshot: MarketCalibrationOpsSnapshot | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __GP_MARKET_CALIBRATION__: GlobalMarketSlot | undefined;
}

function getSlot(): GlobalMarketSlot {
  if (!globalThis.__GP_MARKET_CALIBRATION__) {
    globalThis.__GP_MARKET_CALIBRATION__ = { snapshot: null };
  }
  return globalThis.__GP_MARKET_CALIBRATION__;
}

export function getMarketCalibrationOpsSnapshot(): MarketCalibrationOpsSnapshot | null {
  return getSlot().snapshot;
}

export function buildMarketOpsSnapshot(
  calibrations: MarketEdgeCalibration[],
  storedRows: MarketEdgeRow[] = []
): MarketCalibrationOpsSnapshot {
  const edges =
    calibrations.length > 0
      ? calibrations
      : storedRows.map(rowToCalibration);

  const resolved = edges.filter((e) => e.classification !== "IGNORE");
  const sorted = [...resolved].sort((a, b) => b.edge - a.edge);

  const averageEdge =
    resolved.length > 0
      ? resolved.reduce((s, e) => s + e.edge, 0) / resolved.length
      : 0;

  const closingLineEfficiency =
    resolved.length > 0
      ? Math.round(
          resolved.reduce(
            (s, e) =>
              s +
              (1 - Math.abs(e.closingLineDelta ?? 0) / Math.max(e.marketOdd, 1.01)) *
                100,
            0
          ) / resolved.length
        )
      : 0;

  const marketDrift =
    resolved.length > 0
      ? resolved.reduce((s, e) => s + (e.oddsDrift ?? 0), 0) / resolved.length
      : 0;

  const sharpPressure =
    resolved.length > 0
      ? Math.round(
          resolved.reduce((s, e) => s + (e.sharpPressure ?? 0), 0) /
            resolved.length
        )
      : 0;

  const steamMoves = resolved.filter((e) => e.steamMove).length;

  const byClassification: Record<string, number> = {};
  for (const e of edges) {
    byClassification[e.classification] =
      (byClassification[e.classification] ?? 0) + 1;
  }

  const snapshot: MarketCalibrationOpsSnapshot = {
    updatedAt: new Date().toISOString(),
    calibrated: edges.length,
    averageEdge: Math.round(averageEdge * 10000) / 10000,
    strongestEdge: sorted[0] ?? null,
    closingLineEfficiency,
    marketDrift: Math.round(marketDrift * 1000) / 1000,
    sharpPressure,
    steamMoves,
    edges: sorted.slice(0, 24),
    byClassification,
  };

  getSlot().snapshot = snapshot;
  return snapshot;
}

function rowToCalibration(row: MarketEdgeRow): MarketEdgeCalibration {
  const meta = row.metadata ?? {};
  return {
    fixtureId: row.fixture_id,
    matchId: meta.match_id as string | undefined,
    matchLabel: meta.match_label as string | undefined,
    market: row.market,
    proprietaryProbability: Number(row.proprietary_probability),
    impliedProbability: Number(row.implied_probability),
    edge: Number(row.edge),
    edgePercent: Number(row.edge_percent),
    fairOdd: Number(row.fair_odd),
    marketOdd: Number(row.market_odd),
    expectedValue: Number(row.expected_value),
    confidence: Number(row.confidence),
    marketMispricingScore: Number(row.mispricing_score),
    classification: row.classification as MarketEdgeCalibration["classification"],
    closingLineDelta: row.closing_line_delta ?? undefined,
    oddsDrift: row.odds_drift ?? undefined,
    steamMove: row.steam_move ?? false,
    sharpPressure: meta.sharp_pressure as number | undefined,
    computedAt: row.created_at ?? new Date().toISOString(),
  };
}
