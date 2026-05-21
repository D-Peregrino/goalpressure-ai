/**
 * Quantitative model comparison — simulates versioned model rules against
 * historical signal outcomes without changing runtime or active model.
 */

import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { MarketType } from "@/types/domain";
import type {
  Over05MarketRules,
  Over15MarketRules,
  QuantitativeModel,
} from "@/types/model";
import type { SignalOutcomeRecord } from "@/lib/storage/signalOutcomeStorage";
import {
  buildMatchTimelineFilename,
  type MatchTimelineDocument,
} from "@/lib/storage/matchTimelineStorage";
import { logInfo, logWarn } from "@/lib/utils/logger";

const LOG_SCOPE = "model-comparison";
const SIGNALS_DIR = path.join(process.cwd(), "data", "signals");
const MODELS_DIR = path.join(process.cwd(), "config", "models");
const MATCHES_DIR = path.join(process.cwd(), "data", "matches");
const ANALYTICS_DIR = path.join(process.cwd(), "data", "analytics");
const OUTPUT_FILENAME = "model-comparison.json";

export interface ModelComparisonMetrics {
  totalSignals: number;
  resolvedSignals: number;
  hitRate: number;
  roiTotal: number;
  roiAverage: number;
  maxDrawdown: number;
  bestHitStreak: number;
  worstMissStreak: number;
  averageOdd: number;
  averagePressure: number;
  consistencyScore: number;
}

export interface ModelComparisonEntry {
  modelId: string;
  description: string;
  metrics: ModelComparisonMetrics;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
}

export interface ModelComparisonDocument {
  generatedAt: string;
  models: ModelComparisonEntry[];
  bestOverallModel: string | null;
  safestModel: string | null;
  highestRoiModel: string | null;
}

export interface CompareModelsResult {
  document: ModelComparisonDocument;
  outputPath: string;
  modelsLoaded: number;
}

interface MatchStatsSnapshot {
  dangerousAttacks: number;
  shots: number;
}

let ensureDirPromise: Promise<void> | null = null;
const timelineCache = new Map<string, MatchTimelineDocument | null>();

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

function resolveRoi(record: SignalOutcomeRecord): number {
  if (record.roi != null) return record.roi;
  if (record.outcome === "HIT") return record.triggerOdds - 1;
  return -1;
}

function parseModel(raw: unknown): QuantitativeModel | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as QuantitativeModel;
  if (
    !candidate.modelId ||
    !candidate.markets?.OVER_0_5 ||
    !candidate.markets?.OVER_1_5
  ) {
    return null;
  }
  return candidate;
}

async function loadAllModels(): Promise<QuantitativeModel[]> {
  const models: QuantitativeModel[] = [];

  try {
    const entries = await readdir(MODELS_DIR);
    const modelFiles = entries.filter(
      (name) => name.startsWith("model-") && name.endsWith(".json")
    );

    for (const filename of modelFiles) {
      try {
        const raw = await readFile(path.join(MODELS_DIR, filename), "utf8");
        const parsed = parseModel(JSON.parse(raw));
        if (parsed) models.push(parsed);
      } catch {
        logWarn(LOG_SCOPE, "Skipping invalid model file", { filename });
      }
    }
  } catch {
    logWarn(LOG_SCOPE, "Models directory not readable", { dir: MODELS_DIR });
  }

  return models.sort((a, b) => a.modelId.localeCompare(b.modelId));
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
      // skip corrupt
    }
  }

  return records;
}

async function loadTimelineForRecord(
  record: SignalOutcomeRecord
): Promise<MatchTimelineDocument | null> {
  const cacheKey = record.externalId || record.matchId;
  if (timelineCache.has(cacheKey)) {
    return timelineCache.get(cacheKey) ?? null;
  }

  const pseudoMatch = {
    id: record.matchId,
    externalId: record.externalId,
    homeTeam: record.homeTeam,
    awayTeam: record.awayTeam,
  } as Parameters<typeof buildMatchTimelineFilename>[0];

  const filePath = path.join(MATCHES_DIR, buildMatchTimelineFilename(pseudoMatch));

  try {
    const raw = await readFile(filePath, "utf8");
    const doc = JSON.parse(raw) as MatchTimelineDocument;
    timelineCache.set(cacheKey, doc);
    return doc;
  } catch {
    timelineCache.set(cacheKey, null);
    return null;
  }
}

function statsAtTriggerMinute(
  timeline: MatchTimelineDocument,
  triggerMinute: number
): MatchStatsSnapshot | null {
  const candidates = timeline.timeline.filter((e) => e.minute <= triggerMinute);
  if (candidates.length === 0) return null;

  const entry = candidates[candidates.length - 1];
  return {
    dangerousAttacks: entry.stats.dangerousAttacks,
    shots: entry.stats.shots,
  };
}

async function getStatsForSignal(
  record: SignalOutcomeRecord
): Promise<MatchStatsSnapshot | null> {
  const timeline = await loadTimelineForRecord(record);
  if (!timeline) return null;
  return statsAtTriggerMinute(timeline, record.triggerMinute);
}

function passesOver05Rules(
  record: SignalOutcomeRecord,
  rules: Over05MarketRules,
  stats: MatchStatsSnapshot | null
): boolean {
  if (record.market !== "OVER_0_5") return false;
  if (record.triggerMinute < rules.minMinute || record.triggerMinute > rules.maxMinute) {
    return false;
  }
  if (record.triggerPressure < rules.minPressure) return false;
  if (record.triggerOdds < rules.minOdd) return false;
  if (stats && stats.dangerousAttacks < rules.minDangerousAttacks) return false;
  return true;
}

function passesOver15Rules(
  record: SignalOutcomeRecord,
  rules: Over15MarketRules,
  stats: MatchStatsSnapshot | null
): boolean {
  if (record.market !== "OVER_1_5") return false;
  if (record.triggerMinute < rules.minMinute || record.triggerMinute > rules.maxMinute) {
    return false;
  }
  if (record.triggerPressure < rules.minPressure) return false;
  if (record.triggerOdds < rules.minOdd) return false;
  if (stats) {
    if (stats.dangerousAttacks < rules.minDangerousAttacks) return false;
    if (stats.shots < rules.minShots) return false;
  }
  return true;
}

async function filterSignalsForModel(
  records: SignalOutcomeRecord[],
  model: QuantitativeModel
): Promise<SignalOutcomeRecord[]> {
  const matched: SignalOutcomeRecord[] = [];

  for (const record of records) {
    const stats = await getStatsForSignal(record);

    const passes =
      record.market === "OVER_0_5"
        ? passesOver05Rules(record, model.markets.OVER_0_5, stats)
        : record.market === "OVER_1_5"
          ? passesOver15Rules(record, model.markets.OVER_1_5, stats)
          : false;

    if (passes) matched.push(record);
  }

  return matched;
}

function computeMetrics(records: SignalOutcomeRecord[]): ModelComparisonMetrics {
  const resolved = records.filter(
    (r) => r.status === "RESOLVED" && r.outcome != null && r.resolvedAt
  );
  const hits = resolved.filter((r) => r.outcome === "HIT");
  const roiValues = resolved.map(resolveRoi);
  const roiTotal = roiValues.reduce((sum, v) => sum + v, 0);

  const sorted = [...resolved].sort(
    (a, b) =>
      new Date(a.resolvedAt!).getTime() - new Date(b.resolvedAt!).getTime()
  );

  let bestHitStreak = 0;
  let currentHit = 0;
  let worstMissStreak = 0;
  let currentMiss = 0;
  let cumulative = 0;
  let peak = 0;
  let maxDrawdown = 0;

  for (const record of sorted) {
    const roi = resolveRoi(record);
    if (record.outcome === "HIT") {
      currentHit += 1;
      currentMiss = 0;
      bestHitStreak = Math.max(bestHitStreak, currentHit);
    } else {
      currentMiss += 1;
      currentHit = 0;
      worstMissStreak = Math.max(worstMissStreak, currentMiss);
    }
    cumulative += roi;
    peak = Math.max(peak, cumulative);
    maxDrawdown = Math.max(maxDrawdown, peak - cumulative);
  }

  const hitRate = resolved.length > 0 ? hits.length / resolved.length : 0;
  const roiAverage = resolved.length > 0 ? roiTotal / resolved.length : 0;

  const metrics: ModelComparisonMetrics = {
    totalSignals: records.length,
    resolvedSignals: resolved.length,
    hitRate: round(hitRate),
    roiTotal: round(roiTotal),
    roiAverage: round(roiAverage),
    maxDrawdown: round(maxDrawdown),
    bestHitStreak,
    worstMissStreak,
    averageOdd: round(average(records.map((r) => r.triggerOdds))),
    averagePressure: round(average(records.map((r) => r.triggerPressure))),
    consistencyScore: 0,
  };

  metrics.consistencyScore = computeConsistencyScore(metrics, resolved.length);
  return metrics;
}

export function computeConsistencyScore(
  metrics: ModelComparisonMetrics,
  resolvedCount: number
): number {
  if (resolvedCount === 0) return 0;

  const sampleScore = Math.min(40, (resolvedCount / 20) * 40);
  const hitScore = metrics.hitRate * 25;

  const drawdownPenalty = Math.min(20, metrics.maxDrawdown * 8);
  const roiStability =
    metrics.roiTotal > 0 ? Math.max(0, 20 - drawdownPenalty) : 0;

  const roiAvgComponent = Math.min(
    15,
    Math.max(0, metrics.roiAverage + 0.5) * 12
  );

  return Math.min(
    100,
    Math.round(sampleScore + hitScore + roiStability + roiAvgComponent)
  );
}

function buildStrengthsWeaknesses(
  metrics: ModelComparisonMetrics,
  peerAverage: ModelComparisonMetrics
): { strengths: string[]; weaknesses: string[] } {
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (metrics.hitRate > peerAverage.hitRate + 0.05) {
    strengths.push("Hit rate above peer average");
  }
  if (metrics.hitRate < peerAverage.hitRate - 0.05) {
    weaknesses.push("Hit rate below peer average");
  }
  if (metrics.roiAverage > peerAverage.roiAverage + 0.1) {
    strengths.push("Superior average ROI per signal");
  }
  if (metrics.roiAverage < 0) {
    weaknesses.push("Negative average ROI");
  }
  if (metrics.maxDrawdown < peerAverage.maxDrawdown - 0.5) {
    strengths.push("Lower drawdown than peers");
  }
  if (metrics.maxDrawdown > peerAverage.maxDrawdown + 1) {
    weaknesses.push("Elevated drawdown risk");
  }
  if (metrics.consistencyScore >= 70) {
    strengths.push("High consistency score");
  }
  if (metrics.consistencyScore < 40) {
    weaknesses.push("Low consistency score");
  }
  if (metrics.totalSignals < 3) {
    weaknesses.push("Limited sample size — results inconclusive");
  }

  return { strengths, weaknesses };
}

function buildRecommendation(
  modelId: string,
  metrics: ModelComparisonMetrics,
  rank: { roi: number; safety: number; overall: number },
  totalModels: number
): string {
  if (metrics.resolvedSignals < 3) {
    return `${modelId}: insufficient resolved signals for deployment recommendation.`;
  }

  if (rank.overall === 1) {
    return `${modelId}: strongest overall balance of ROI, consistency, and risk — candidate for A/B testing.`;
  }
  if (rank.roi === 1) {
    return `${modelId}: highest ROI profile — monitor drawdown before promotion.`;
  }
  if (rank.safety === 1) {
    return `${modelId}: safest risk profile (low drawdown) — suitable for conservative allocation.`;
  }

  if (metrics.roiTotal > 0 && metrics.consistencyScore >= 55) {
    return `${modelId}: viable secondary model (${totalModels} compared).`;
  }

  return `${modelId}: underperforms peers on risk-adjusted metrics — keep as research variant only.`;
}

function computePeerAverage(
  entries: ModelComparisonEntry[]
): ModelComparisonMetrics {
  if (entries.length === 0) {
    return {
      totalSignals: 0,
      resolvedSignals: 0,
      hitRate: 0,
      roiTotal: 0,
      roiAverage: 0,
      maxDrawdown: 0,
      bestHitStreak: 0,
      worstMissStreak: 0,
      averageOdd: 0,
      averagePressure: 0,
      consistencyScore: 0,
    };
  }

  const n = entries.length;
  const sum = entries.reduce(
    (acc, e) => ({
      totalSignals: acc.totalSignals + e.metrics.totalSignals,
      resolvedSignals: acc.resolvedSignals + e.metrics.resolvedSignals,
      hitRate: acc.hitRate + e.metrics.hitRate,
      roiTotal: acc.roiTotal + e.metrics.roiTotal,
      roiAverage: acc.roiAverage + e.metrics.roiAverage,
      maxDrawdown: acc.maxDrawdown + e.metrics.maxDrawdown,
      bestHitStreak: 0,
      worstMissStreak: 0,
      averageOdd: acc.averageOdd + e.metrics.averageOdd,
      averagePressure: acc.averagePressure + e.metrics.averagePressure,
      consistencyScore: acc.consistencyScore + e.metrics.consistencyScore,
    }),
    {
      totalSignals: 0,
      resolvedSignals: 0,
      hitRate: 0,
      roiTotal: 0,
      roiAverage: 0,
      maxDrawdown: 0,
      bestHitStreak: 0,
      worstMissStreak: 0,
      averageOdd: 0,
      averagePressure: 0,
      consistencyScore: 0,
    }
  );

  return {
    totalSignals: sum.totalSignals / n,
    resolvedSignals: sum.resolvedSignals / n,
    hitRate: sum.hitRate / n,
    roiTotal: sum.roiTotal / n,
    roiAverage: sum.roiAverage / n,
    maxDrawdown: sum.maxDrawdown / n,
    bestHitStreak: 0,
    worstMissStreak: 0,
    averageOdd: sum.averageOdd / n,
    averagePressure: sum.averagePressure / n,
    consistencyScore: sum.consistencyScore / n,
  };
}

function overallScore(metrics: ModelComparisonMetrics): number {
  const riskAdjusted =
    metrics.roiAverage > 0
      ? metrics.roiAverage / (1 + metrics.maxDrawdown)
      : metrics.roiAverage;

  return (
    metrics.consistencyScore * 0.35 +
    metrics.hitRate * 100 * 0.25 +
    riskAdjusted * 100 * 0.25 +
    Math.min(15, metrics.resolvedSignals) * 0.15
  );
}

function pickLeaders(entries: ModelComparisonEntry[]): {
  bestOverallModel: string | null;
  safestModel: string | null;
  highestRoiModel: string | null;
} {
  const withData = entries.filter((e) => e.metrics.resolvedSignals >= 1);
  if (withData.length === 0) {
    return {
      bestOverallModel: null,
      safestModel: null,
      highestRoiModel: null,
    };
  }

  const byOverall = [...withData].sort(
    (a, b) => overallScore(b.metrics) - overallScore(a.metrics)
  );
  const byRoi = [...withData].sort(
    (a, b) => b.metrics.roiTotal - a.metrics.roiTotal
  );
  const bySafety = [...withData].sort(
    (a, b) => a.metrics.maxDrawdown - b.metrics.maxDrawdown
  );
  const byConsistency = [...withData].sort(
    (a, b) => b.metrics.consistencyScore - a.metrics.consistencyScore
  );

  return {
    bestOverallModel: byOverall[0]?.modelId ?? null,
    safestModel: bySafety[0]?.modelId ?? byConsistency[0]?.modelId ?? null,
    highestRoiModel: byRoi[0]?.modelId ?? null,
  };
}

/**
 * Compares all model-*.json configs by simulating their rules on historical signals.
 */
export async function compareModels(
  records?: SignalOutcomeRecord[]
): Promise<CompareModelsResult> {
  await ensureAnalyticsDir();
  timelineCache.clear();

  const [models, signalRecords] = await Promise.all([
    loadAllModels(),
    records ?? loadSignalRecords(),
  ]);

  logInfo(LOG_SCOPE, "Models loaded", {
    count: models.length,
    modelIds: models.map((m) => m.modelId),
    historicalSignals: signalRecords.length,
  });

  const entries: ModelComparisonEntry[] = [];

  for (const model of models) {
    const filtered = await filterSignalsForModel(signalRecords, model);
    const metrics = computeMetrics(filtered);

    entries.push({
      modelId: model.modelId,
      description: model.description,
      metrics,
      strengths: [],
      weaknesses: [],
      recommendation: "",
    });
  }

  const peerAverage = computePeerAverage(entries);

  const roiRank = new Map(
    [...entries]
      .sort((a, b) => b.metrics.roiTotal - a.metrics.roiTotal)
      .map((e, i) => [e.modelId, i + 1])
  );
  const safetyRank = new Map(
    [...entries]
      .sort((a, b) => a.metrics.maxDrawdown - b.metrics.maxDrawdown)
      .map((e, i) => [e.modelId, i + 1])
  );
  const overallRank = new Map(
    [...entries]
      .sort((a, b) => overallScore(b.metrics) - overallScore(a.metrics))
      .map((e, i) => [e.modelId, i + 1])
  );

  for (const entry of entries) {
    const { strengths, weaknesses } = buildStrengthsWeaknesses(
      entry.metrics,
      peerAverage
    );
    entry.strengths = strengths;
    entry.weaknesses = weaknesses;
    entry.recommendation = buildRecommendation(
      entry.modelId,
      entry.metrics,
      {
        roi: roiRank.get(entry.modelId) ?? 99,
        safety: safetyRank.get(entry.modelId) ?? 99,
        overall: overallRank.get(entry.modelId) ?? 99,
      },
      entries.length
    );
  }

  entries.sort((a, b) => overallScore(b.metrics) - overallScore(a.metrics));

  const leaders = pickLeaders(entries);

  const document: ModelComparisonDocument = {
    generatedAt: new Date().toISOString(),
    models: entries,
    ...leaders,
  };

  const outputPath = path.join(ANALYTICS_DIR, OUTPUT_FILENAME);
  await writeFile(outputPath, JSON.stringify(document, null, 2), "utf8");

  logInfo(LOG_SCOPE, "Best model detected", {
    bestOverallModel: document.bestOverallModel,
    safestModel: document.safestModel,
    highestRoiModel: document.highestRoiModel,
  });

  logInfo(LOG_SCOPE, "Model comparison completed", {
    outputPath,
    modelsCompared: entries.length,
    bestOverallModel: document.bestOverallModel,
  });

  return {
    document,
    outputPath,
    modelsLoaded: models.length,
  };
}
