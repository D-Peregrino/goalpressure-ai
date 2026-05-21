/**
 * Quantitative analytics over persisted signal outcome records.
 */

import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { MarketType, SignalConfidence } from "@/types/domain";
import type { SignalOutcomeRecord } from "@/lib/storage/signalOutcomeStorage";
import { compareModels } from "@/lib/analytics/modelComparison";
import { generateModelRecommendations } from "@/lib/analytics/modelRecommendations";
import { generateSignalSegmentations } from "@/lib/analytics/signalSegmentation";
import { logInfo, logWarn } from "@/lib/utils/logger";

const LOG_SCOPE = "signal-analytics";
const SIGNALS_DIR = path.join(process.cwd(), "data", "signals");
const ANALYTICS_DIR = path.join(process.cwd(), "data", "analytics");
const SUMMARY_FILENAME = "analytics-summary.json";

export type PressureRangeKey = "60-69" | "70-79" | "80-89" | "90+";

export interface SignalMetricTotals {
  totalSignals: number;
  resolvedSignals: number;
  pendingSignals: number;
  hitRate: number;
  missRate: number;
  roiTotal: number;
  roiAverage: number;
  averageOdd: number;
  averagePressure: number;
  averageTimeToResolution: number;
}

export interface SignalMetricBucket extends SignalMetricTotals {
  hits: number;
  misses: number;
}

export interface RoiCurvePoint {
  signalId: string;
  resolvedAt: string;
  outcome: "HIT" | "MISS";
  roi: number;
  cumulativeRoi: number;
}

export interface SignalStreakMetrics {
  bestHitStreak: number;
  worstMissStreak: number;
  maxDrawdown: number;
  cumulativeRoi: number;
}

export interface SignalAnalyticsSummary {
  generatedAt: string;
  totals: SignalMetricTotals;
  byMarket: Record<MarketType, SignalMetricBucket>;
  byConfidence: Record<SignalConfidence, SignalMetricBucket>;
  byPressureRange: Record<PressureRangeKey, SignalMetricBucket>;
  roiCurve: RoiCurvePoint[];
  streaks: SignalStreakMetrics;
}

export interface GenerateSignalAnalyticsResult {
  summary: SignalAnalyticsSummary;
  signalsProcessed: number;
  outputPath: string;
}

let ensureDirPromise: Promise<void> | null = null;

async function ensureAnalyticsDir(): Promise<void> {
  if (!ensureDirPromise) {
    ensureDirPromise = mkdir(ANALYTICS_DIR, { recursive: true }).then(
      () => undefined
    );
  }
  await ensureDirPromise;
}

function round(value: number, decimals = 4): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function getPressureRange(
  pressure: number
): PressureRangeKey | null {
  if (pressure >= 90) return "90+";
  if (pressure >= 80) return "80-89";
  if (pressure >= 70) return "70-79";
  if (pressure >= 60) return "60-69";
  return null;
}

function emptyBucket(): SignalMetricBucket {
  return {
    totalSignals: 0,
    resolvedSignals: 0,
    pendingSignals: 0,
    hits: 0,
    misses: 0,
    hitRate: 0,
    missRate: 0,
    roiTotal: 0,
    roiAverage: 0,
    averageOdd: 0,
    averagePressure: 0,
    averageTimeToResolution: 0,
  };
}

function computeBucketMetrics(
  records: SignalOutcomeRecord[]
): SignalMetricBucket {
  const resolved = records.filter(
    (r) => r.status === "RESOLVED" && r.outcome != null
  );
  const pending = records.filter((r) => r.status !== "RESOLVED");
  const hits = resolved.filter((r) => r.outcome === "HIT");
  const misses = resolved.filter((r) => r.outcome === "MISS");

  const roiValues = resolved
    .map((r) => r.roi)
    .filter((v): v is number => v != null);
  const roiTotal = roiValues.reduce((sum, v) => sum + v, 0);

  const resolvedCount = resolved.length;

  return {
    totalSignals: records.length,
    resolvedSignals: resolvedCount,
    pendingSignals: pending.length,
    hits: hits.length,
    misses: misses.length,
    hitRate: resolvedCount > 0 ? round(hits.length / resolvedCount) : 0,
    missRate: resolvedCount > 0 ? round(misses.length / resolvedCount) : 0,
    roiTotal: round(roiTotal),
    roiAverage:
      resolvedCount > 0 ? round(roiTotal / resolvedCount) : 0,
    averageOdd: round(average(records.map((r) => r.triggerOdds))),
    averagePressure: round(average(records.map((r) => r.triggerPressure))),
    averageTimeToResolution: round(
      average(
        resolved
          .map((r) => r.timeToResolution)
          .filter((v): v is number => v != null)
      )
    ),
  };
}

function computeTotals(records: SignalOutcomeRecord[]): SignalMetricTotals {
  const bucket = computeBucketMetrics(records);
  const { hits: _h, misses: _m, ...totals } = bucket;
  return totals;
}

function buildEmptyByMarket(): Record<MarketType, SignalMetricBucket> {
  return {
    OVER_0_5: emptyBucket(),
    OVER_1_5: emptyBucket(),
  };
}

function buildEmptyByConfidence(): Record<
  SignalConfidence,
  SignalMetricBucket
> {
  return {
    MEDIUM: emptyBucket(),
    HIGH: emptyBucket(),
  };
}

function buildEmptyByPressureRange(): Record<
  PressureRangeKey,
  SignalMetricBucket
> {
  return {
    "60-69": emptyBucket(),
    "70-79": emptyBucket(),
    "80-89": emptyBucket(),
    "90+": emptyBucket(),
  };
}

function computeStreaksAndCurve(
  records: SignalOutcomeRecord[]
): { streaks: SignalStreakMetrics; roiCurve: RoiCurvePoint[] } {
  const resolved = records
    .filter((r) => r.status === "RESOLVED" && r.outcome != null && r.resolvedAt)
    .sort(
      (a, b) =>
        new Date(a.resolvedAt!).getTime() - new Date(b.resolvedAt!).getTime()
    );

  let bestHitStreak = 0;
  let currentHitStreak = 0;
  let worstMissStreak = 0;
  let currentMissStreak = 0;
  let cumulativeRoi = 0;
  let peak = 0;
  let maxDrawdown = 0;
  const roiCurve: RoiCurvePoint[] = [];

  for (const record of resolved) {
    const roi = record.roi ?? (record.outcome === "HIT" ? record.triggerOdds - 1 : -1);

    if (record.outcome === "HIT") {
      currentHitStreak += 1;
      currentMissStreak = 0;
      bestHitStreak = Math.max(bestHitStreak, currentHitStreak);
    } else {
      currentMissStreak += 1;
      currentHitStreak = 0;
      worstMissStreak = Math.max(worstMissStreak, currentMissStreak);
    }

    cumulativeRoi += roi;
    peak = Math.max(peak, cumulativeRoi);
    maxDrawdown = Math.max(maxDrawdown, peak - cumulativeRoi);

    roiCurve.push({
      signalId: record.signalId,
      resolvedAt: record.resolvedAt!,
      outcome: record.outcome!,
      roi: round(roi),
      cumulativeRoi: round(cumulativeRoi),
    });
  }

  return {
      streaks: {
        bestHitStreak,
        worstMissStreak,
        maxDrawdown: round(maxDrawdown),
        cumulativeRoi: round(cumulativeRoi),
      },
      roiCurve,
    };
}

async function loadSignalRecords(): Promise<SignalOutcomeRecord[]> {
  let files: string[] = [];

  try {
    const entries = await readdir(SIGNALS_DIR);
    files = entries
      .filter((name) => name.startsWith("signal-") && name.endsWith(".json"))
      .map((name) => path.join(SIGNALS_DIR, name));
  } catch {
    return [];
  }

  const records: SignalOutcomeRecord[] = [];

  for (const filePath of files) {
    try {
      const raw = await readFile(filePath, "utf8");
      records.push(JSON.parse(raw) as SignalOutcomeRecord);
    } catch {
      logWarn(LOG_SCOPE, "Skipping unreadable signal file", {
        file: path.basename(filePath),
      });
    }
  }

  return records;
}

function buildSummary(records: SignalOutcomeRecord[]): SignalAnalyticsSummary {
  const byMarket = buildEmptyByMarket();
  const byConfidence = buildEmptyByConfidence();
  const byPressureRange = buildEmptyByPressureRange();

  const marketGroups = new Map<MarketType, SignalOutcomeRecord[]>();
  const confidenceGroups = new Map<SignalConfidence, SignalOutcomeRecord[]>();
  const pressureGroups = new Map<PressureRangeKey, SignalOutcomeRecord[]>();

  for (const record of records) {
    const marketList = marketGroups.get(record.market) ?? [];
    marketList.push(record);
    marketGroups.set(record.market, marketList);

    const confList = confidenceGroups.get(record.confidence) ?? [];
    confList.push(record);
    confidenceGroups.set(record.confidence, confList);

    const range = getPressureRange(record.triggerPressure);
    if (range) {
      const rangeList = pressureGroups.get(range) ?? [];
      rangeList.push(record);
      pressureGroups.set(range, rangeList);
    }
  }

  for (const [market, group] of marketGroups) {
    byMarket[market] = computeBucketMetrics(group);
  }

  for (const [confidence, group] of confidenceGroups) {
    byConfidence[confidence] = computeBucketMetrics(group);
  }

  for (const [range, group] of pressureGroups) {
    byPressureRange[range] = computeBucketMetrics(group);
  }

  const { streaks, roiCurve } = computeStreaksAndCurve(records);
  const totals = computeTotals(records);

  return {
    generatedAt: new Date().toISOString(),
    totals,
    byMarket,
    byConfidence,
    byPressureRange,
    roiCurve,
    streaks,
  };
}

/**
 * Reads all signal outcome files, computes quantitative metrics, and writes
 * `data/analytics/analytics-summary.json`.
 */
export async function generateSignalAnalytics(): Promise<GenerateSignalAnalyticsResult> {
  await ensureAnalyticsDir();

  const records = await loadSignalRecords();
  const summary = buildSummary(records);
  const outputPath = path.join(ANALYTICS_DIR, SUMMARY_FILENAME);

  await writeFile(outputPath, JSON.stringify(summary, null, 2), "utf8");

  logInfo(LOG_SCOPE, "Signals processed", {
    count: records.length,
    resolved: summary.totals.resolvedSignals,
    pending: summary.totals.pendingSignals,
  });

  logInfo(LOG_SCOPE, "ROI calculated", {
    roiTotal: summary.totals.roiTotal,
    roiAverage: summary.totals.roiAverage,
    cumulativeRoi: summary.streaks.cumulativeRoi,
    maxDrawdown: summary.streaks.maxDrawdown,
  });

  logInfo(LOG_SCOPE, "Analytics generated", {
    outputPath,
    generatedAt: summary.generatedAt,
    hitRate: summary.totals.hitRate,
    totalSignals: summary.totals.totalSignals,
  });

  await generateSignalSegmentations(records);
  await generateModelRecommendations();
  await compareModels(records);

  return {
    summary,
    signalsProcessed: records.length,
    outputPath,
  };
}

/** Fire-and-forget — does not block API responses. */
export function generateSignalAnalyticsAsync(): void {
  void generateSignalAnalytics().catch((error) => {
    const message = error instanceof Error ? error.message : "Unknown error";
    logWarn(LOG_SCOPE, "Analytics generation failed", { message });
  });
}
