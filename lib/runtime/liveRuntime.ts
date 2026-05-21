/**
 * Live runtime — aplica o motor quantitativo a cada ciclo de polling,
 * persiste live_metrics e expõe snapshot para /ops e terminal.
 */

import type { Match } from "@/types/domain";
import {
  applyQuantitativePressureToMatch,
  calculateFixtureTeamPressures,
  type QuantitativePressureResult,
} from "@/lib/engine/pressureScore";
import { persistLiveMetrics } from "@/lib/live/liveMetricsPersistence";
import { recordRuntimeOpsLog } from "@/lib/ops/opsStore";
import { logOps } from "@/lib/utils/logger";

const LOG_SCOPE = "live-runtime";

export interface LiveMetricRecord {
  fixtureId: string;
  matchId: string;
  matchLabel: string;
  minute: number;
  homePressure: number;
  awayPressure: number;
  pressureScore: number;
  momentum: number;
  offensiveIntensity: number;
  goalProbability: number;
  confidence: number;
  computedAt: string;
}

export interface LiveRuntimeMetricsSnapshot {
  updatedAt: string;
  matchCount: number;
  metrics: LiveMetricRecord[];
  topPressure: LiveMetricRecord | null;
}

export interface ProcessLiveRuntimeMetricsResult {
  processed: number;
  metricsPersisted: number;
  metricsFailed: number;
  matches: Match[];
  snapshot: LiveRuntimeMetricsSnapshot;
}

interface GlobalLiveRuntimeSlot {
  snapshot: LiveRuntimeMetricsSnapshot | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __GP_LIVE_RUNTIME__: GlobalLiveRuntimeSlot | undefined;
}

function getSlot(): GlobalLiveRuntimeSlot {
  if (!globalThis.__GP_LIVE_RUNTIME__) {
    globalThis.__GP_LIVE_RUNTIME__ = { snapshot: null };
  }
  return globalThis.__GP_LIVE_RUNTIME__;
}

export function getLiveRuntimeMetricsSnapshot(): LiveRuntimeMetricsSnapshot | null {
  return getSlot().snapshot;
}

function buildMetricRecord(
  match: Match,
  teams: { home: number; away: number; aggregate: QuantitativePressureResult }
): LiveMetricRecord {
  const fixtureId = match.externalId ?? match.id.replace(/^sm-/, "");
  const agg = teams.aggregate;

  return {
    fixtureId,
    matchId: match.id,
    matchLabel: `${match.homeTeam} vs ${match.awayTeam}`,
    minute: match.minute,
    homePressure: teams.home,
    awayPressure: teams.away,
    pressureScore: agg.pressureScore,
    momentum: agg.momentum,
    offensiveIntensity: agg.offensiveIntensity,
    goalProbability: agg.goalProbability,
    confidence: agg.confidence,
    computedAt: new Date().toISOString(),
  };
}

function logTerminalPressure(records: LiveMetricRecord[]): void {
  if (records.length === 0) {
    logOps(LOG_SCOPE, "[live] nenhuma partida ao vivo para métricas");
    return;
  }

  const top = [...records].sort((a, b) => b.pressureScore - a.pressureScore)[0];
  logOps(LOG_SCOPE, "[live] pressure cycle", {
    matches: records.length,
    top: {
      label: top.matchLabel,
      minute: top.minute,
      P: top.pressureScore,
      home: top.homePressure,
      away: top.awayPressure,
      momentum: top.momentum,
      goalP: top.goalProbability,
    },
  });

  for (const row of records.slice(0, 8)) {
    logOps(
      LOG_SCOPE,
      `[live] ${row.matchLabel} ${row.minute}' | P=${row.pressureScore} H=${row.homePressure} A=${row.awayPressure} M=${row.momentum} GP=${(row.goalProbability * 100).toFixed(0)}%`
    );
  }
}

/**
 * Calcula pressure/momentum por partida, atualiza match.pressure, persiste live_metrics.
 */
export async function processLiveRuntimeMetrics(
  matches: Match[]
): Promise<ProcessLiveRuntimeMetricsResult> {
  const enriched: Match[] = [];
  const records: LiveMetricRecord[] = [];

  for (const match of matches) {
    const teams = calculateFixtureTeamPressures(match);
    const withPressure = applyQuantitativePressureToMatch(match);
    enriched.push(withPressure);
    records.push(buildMetricRecord(withPressure, teams));
  }

  const persistResult = await persistLiveMetrics(records);

  const sorted = [...records].sort((a, b) => b.pressureScore - a.pressureScore);
  const snapshot: LiveRuntimeMetricsSnapshot = {
    updatedAt: new Date().toISOString(),
    matchCount: records.length,
    metrics: sorted,
    topPressure: sorted[0] ?? null,
  };

  getSlot().snapshot = snapshot;

  logTerminalPressure(records);

  await recordRuntimeOpsLog({
    event: "pressure_metrics_cycle",
    message: `Pressure metrics: ${records.length} fixtures, ${persistResult.persisted} saved`,
    metadata: {
      processed: records.length,
      persisted: persistResult.persisted,
      failed: persistResult.failed,
      topPressure: snapshot.topPressure?.pressureScore ?? 0,
      topMatch: snapshot.topPressure?.matchLabel ?? null,
    },
  });

  return {
    processed: records.length,
    metricsPersisted: persistResult.persisted,
    metricsFailed: persistResult.failed,
    matches: enriched,
    snapshot,
  };
}
