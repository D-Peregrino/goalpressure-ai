/**
 * Adaptive quantitative intelligence — suggests model optimizations from
 * historical analytics without mutating the live signal engine.
 */

import { readFile, writeFile } from "fs/promises";
import path from "path";
import type { MarketType, SignalConfidence } from "@/types/domain";
import type { SignalAnalyticsSummary } from "@/lib/analytics/signalAnalytics";
import type {
  SegmentMetrics,
  SignalSegmentationDocument,
} from "@/lib/analytics/signalSegmentation";
import { logInfo, logWarn } from "@/lib/utils/logger";

const LOG_SCOPE = "model-recommendations";
const ANALYTICS_DIR = path.join(process.cwd(), "data", "analytics");
const SUMMARY_PATH = path.join(ANALYTICS_DIR, "analytics-summary.json");
const SEGMENTATIONS_PATH = path.join(ANALYTICS_DIR, "segmentations.json");
const OUTPUT_FILENAME = "model-recommendations.json";

/** Minimum signals in a segment before emitting a recommendation */
const MIN_SAMPLE_SIZE = 3;
/** Strong evidence threshold for high-confidence suggestions */
const STRONG_SAMPLE_SIZE = 8;

export type RecommendationType =
  | "PROFITABLE_PATTERN"
  | "RISKY_PATTERN"
  | "THRESHOLD"
  | "MARKET"
  | "CONFIDENCE"
  | "COMPARATIVE";

export interface ModelRecommendation {
  type: RecommendationType;
  metric: string;
  currentValue: string | number;
  suggestedValue: string | number;
  reason: string;
  confidence: number;
  supportingData: Record<string, unknown>;
}

export interface ModelRecommendationsDocument {
  generatedAt: string;
  profitablePatterns: ModelRecommendation[];
  riskyPatterns: ModelRecommendation[];
  thresholdSuggestions: ModelRecommendation[];
  marketInsights: ModelRecommendation[];
  confidenceInsights: ModelRecommendation[];
}

export interface GenerateModelRecommendationsResult {
  document: ModelRecommendationsDocument;
  outputPath: string;
  profitableCount: number;
  riskyCount: number;
}

interface SegmentEntry {
  dimension: string;
  key: string;
  metrics: SegmentMetrics;
}

const ENGINE_THRESHOLDS = {
  over05: {
    minMinute: 20,
    maxMinute: 80,
    minPressure: 70,
    highPressure: 80,
    minOdd: 1.5,
  },
  over15: {
    minMinute: 25,
    maxMinute: 70,
    minPressure: 75,
    highPressure: 80,
    minOdd: 1.7,
  },
} as const;

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function formatPct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function formatRoi(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}u`;
}

/**
 * Scores recommendation confidence 0–100 from sample size, ROI consistency, hit rate.
 */
export function computeRecommendationConfidence(
  metrics: SegmentMetrics,
  polarity: "positive" | "negative"
): number {
  if (metrics.totalSignals < MIN_SAMPLE_SIZE) return 0;

  const sampleRatio = Math.min(1, metrics.totalSignals / STRONG_SAMPLE_SIZE);
  const sampleScore = sampleRatio * 40;

  const hitComponent = metrics.hitRate * 30;
  const roiMagnitude = Math.min(1, Math.abs(metrics.roiAverage) / 0.5);
  const roiAligned =
    polarity === "positive"
      ? metrics.roiAverage > 0
      : metrics.roiAverage < 0;
  const roiScore = roiAligned ? roiMagnitude * 30 : roiMagnitude * 10;

  const consistencyBonus =
    polarity === "positive" && metrics.roiTotal > 0 ? 10 : 0;
  const riskPenalty =
    polarity === "negative" && metrics.roiTotal < 0 ? 10 : 0;

  return Math.min(
    100,
    Math.round(sampleScore + hitComponent + roiScore + consistencyBonus + riskPenalty)
  );
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as NodeJS.ErrnoException).code)
        : "";
    if (code === "ENOENT") return null;
    throw error;
  }
}

function collectSegmentEntries(
  segmentations: SignalSegmentationDocument
): SegmentEntry[] {
  const entries: SegmentEntry[] = [];

  const push = (
    dimension: string,
    record: Record<string, SegmentMetrics>
  ) => {
    for (const [key, metrics] of Object.entries(record)) {
      entries.push({ dimension, key, metrics });
    }
  };

  push("minute", segmentations.byMinuteRange);
  push("pressure", segmentations.byPressureRange);
  push("odd", segmentations.byOddRange);
  push("confidence", segmentations.byConfidence);
  push("market", segmentations.byMarket);

  return entries;
}

function isProfitable(metrics: SegmentMetrics): boolean {
  return (
    metrics.totalSignals >= MIN_SAMPLE_SIZE &&
    metrics.roiTotal > 0 &&
    metrics.roiAverage > 0
  );
}

function isRisky(metrics: SegmentMetrics): boolean {
  return (
    metrics.totalSignals >= MIN_SAMPLE_SIZE &&
    metrics.roiTotal < 0 &&
    metrics.roiAverage < 0
  );
}

function buildProfitableRecommendation(
  entry: SegmentEntry
): ModelRecommendation {
  const { dimension, key, metrics } = entry;
  return {
    type: "PROFITABLE_PATTERN",
    metric: `${dimension}_range`,
    currentValue: key,
    suggestedValue: `prioritize_${dimension}_${key.replace(/[^a-z0-9+]/gi, "_")}`,
    reason: `${dimension} range ${key} shows positive ROI (${formatRoi(metrics.roiTotal)} total, ${formatRoi(metrics.roiAverage)} avg) with ${formatPct(metrics.hitRate)} hit rate over ${metrics.totalSignals} signals.`,
    confidence: computeRecommendationConfidence(metrics, "positive"),
    supportingData: {
      dimension,
      segment: key,
      totalSignals: metrics.totalSignals,
      hitRate: metrics.hitRate,
      roiTotal: metrics.roiTotal,
      roiAverage: metrics.roiAverage,
      avgPressure: metrics.avgPressure,
      avgOdd: metrics.avgOdd,
      avgMinute: metrics.avgMinute,
    },
  };
}

function buildRiskyRecommendation(entry: SegmentEntry): ModelRecommendation {
  const { dimension, key, metrics } = entry;
  return {
    type: "RISKY_PATTERN",
    metric: `${dimension}_range`,
    currentValue: key,
    suggestedValue: `reduce_exposure_${dimension}_${key.replace(/[^a-z0-9+]/gi, "_")}`,
    reason: `${dimension} range ${key} shows negative ROI (${formatRoi(metrics.roiTotal)} total, ${formatRoi(metrics.roiAverage)} avg) with ${formatPct(metrics.hitRate)} hit rate over ${metrics.totalSignals} signals.`,
    confidence: computeRecommendationConfidence(metrics, "negative"),
    supportingData: {
      dimension,
      segment: key,
      totalSignals: metrics.totalSignals,
      hitRate: metrics.hitRate,
      roiTotal: metrics.roiTotal,
      roiAverage: metrics.roiAverage,
      avgPressure: metrics.avgPressure,
      avgOdd: metrics.avgOdd,
      avgMinute: metrics.avgMinute,
    },
  };
}

function findBestAndWorst(
  entries: SegmentEntry[],
  dimension: string
): { best: SegmentEntry | null; worst: SegmentEntry | null } {
  const filtered = entries.filter(
    (e) => e.dimension === dimension && e.metrics.totalSignals >= MIN_SAMPLE_SIZE
  );
  if (filtered.length === 0) return { best: null, worst: null };

  const sorted = [...filtered].sort(
    (a, b) => b.metrics.roiAverage - a.metrics.roiAverage
  );

  return {
    best: sorted[0] ?? null,
    worst: sorted[sorted.length - 1] ?? null,
  };
}

function buildComparativeRecommendation(
  better: SegmentEntry,
  worse: SegmentEntry,
  label: string
): ModelRecommendation | null {
  if (better.metrics.roiAverage <= worse.metrics.roiAverage) return null;

  const roiGap = round(better.metrics.roiAverage - worse.metrics.roiAverage);
  const hitGap = round(better.metrics.hitRate - worse.metrics.hitRate);

  return {
    type: "COMPARATIVE",
    metric: `${better.dimension}_comparison`,
    currentValue: worse.key,
    suggestedValue: better.key,
    reason: `${label}: ${better.dimension} ${better.key} (${formatRoi(better.metrics.roiAverage)} avg ROI) outperforms ${worse.key} (${formatRoi(worse.metrics.roiAverage)} avg ROI) by ${formatRoi(roiGap)} per signal.`,
    confidence: Math.min(
      computeRecommendationConfidence(better.metrics, "positive"),
      computeRecommendationConfidence(worse.metrics, "negative")
    ),
    supportingData: {
      betterSegment: better.key,
      worseSegment: worse.key,
      roiGap,
      hitRateGap: hitGap,
      better: better.metrics,
      worse: worse.metrics,
    },
  };
}

function buildThresholdSuggestions(
  segmentations: SignalSegmentationDocument
): ModelRecommendation[] {
  const suggestions: ModelRecommendation[] = [];
  const pressure = segmentations.byPressureRange;
  const minutes = segmentations.byMinuteRange;
  const odds = segmentations.byOddRange;

  const lowPressure = pressure["60-69"];
  const midPressure = pressure["70-79"];
  const highPressure = pressure["80-89"];
  const extremePressure = pressure["90+"];

  if (
    isRisky(lowPressure) &&
    isProfitable(highPressure) &&
    lowPressure.totalSignals >= MIN_SAMPLE_SIZE
  ) {
    suggestions.push({
      type: "THRESHOLD",
      metric: "min_pressure_over05",
      currentValue: ENGINE_THRESHOLDS.over05.minPressure,
      suggestedValue: 80,
      reason: `Pressure 60-69 underperforms (${formatRoi(lowPressure.roiAverage)} avg) while 80-89 is profitable (${formatRoi(highPressure.roiAverage)} avg). Consider raising minimum pressure threshold.`,
      confidence: computeRecommendationConfidence(highPressure, "positive"),
      supportingData: {
        lowBand: lowPressure,
        highBand: highPressure,
        engineMarket: "OVER_0_5",
      },
    });
  }

  if (
    extremePressure.totalSignals >= MIN_SAMPLE_SIZE &&
    highPressure.totalSignals >= MIN_SAMPLE_SIZE &&
    extremePressure.roiAverage < highPressure.roiAverage &&
    extremePressure.roiTotal < 0
  ) {
    suggestions.push({
      type: "THRESHOLD",
      metric: "pressure_cap_high_band",
      currentValue: "90+",
      suggestedValue: "80-89",
      reason: `Pressure 90+ possui ROI inferior a 80-89 (${formatRoi(extremePressure.roiAverage)} vs ${formatRoi(highPressure.roiAverage)} avg). Extreme pressure may indicate over-fitted entries.`,
      confidence: computeRecommendationConfidence(extremePressure, "negative"),
      supportingData: {
        extreme: extremePressure,
        high: highPressure,
      },
    });
  }

  if (midPressure.totalSignals >= MIN_SAMPLE_SIZE && isProfitable(midPressure)) {
    suggestions.push({
      type: "THRESHOLD",
      metric: "min_pressure_over05",
      currentValue: ENGINE_THRESHOLDS.over05.minPressure,
      suggestedValue: 75,
      reason: `Pressure 70-79 shows promising ROI (${formatRoi(midPressure.roiAverage)} avg). Threshold 70 may be too permissive if lower bands fail.`,
      confidence: computeRecommendationConfidence(midPressure, "positive"),
      supportingData: { band: midPressure },
    });
  }

  const lateGame = minutes["76-90+"];
  const midLate = minutes["61-75"];

  if (isRisky(lateGame)) {
    suggestions.push({
      type: "THRESHOLD",
      metric: "max_minute_signal",
      currentValue: ENGINE_THRESHOLDS.over05.maxMinute,
      suggestedValue: 75,
      reason: `Signals após 75' (76-90+) possuem ROI negativo (${formatRoi(lateGame.roiTotal)} total, ${formatPct(lateGame.hitRate)} HR). Consider tightening max minute window.`,
      confidence: computeRecommendationConfidence(lateGame, "negative"),
      supportingData: { lateGame, engineMaxMinute: ENGINE_THRESHOLDS.over05.maxMinute },
    });
  }

  if (
    midLate.totalSignals >= MIN_SAMPLE_SIZE &&
    isProfitable(midLate) &&
    isRisky(lateGame)
  ) {
    suggestions.push({
      type: "THRESHOLD",
      metric: "preferred_minute_window",
      currentValue: "20-80",
      suggestedValue: "20-75",
      reason: `Minute 61-75 outperforms 76-90+ (${formatRoi(midLate.roiAverage)} vs ${formatRoi(lateGame.roiAverage)} avg ROI).`,
      confidence: Math.min(
        computeRecommendationConfidence(midLate, "positive"),
        computeRecommendationConfidence(lateGame, "negative")
      ),
      supportingData: { midLate, lateGame },
    });
  }

  const sweetOdd = odds["1.60-1.89"];
  const lowOdd = odds["1.30-1.59"];
  const highOdd = odds["2.30+"];

  if (isProfitable(sweetOdd)) {
    const compareTarget =
      lowOdd.totalSignals >= MIN_SAMPLE_SIZE ? lowOdd : highOdd;
    if (
      compareTarget.totalSignals >= MIN_SAMPLE_SIZE &&
      sweetOdd.roiAverage > compareTarget.roiAverage
    ) {
      suggestions.push({
        type: "THRESHOLD",
        metric: "preferred_odd_range",
        currentValue: `>= ${ENGINE_THRESHOLDS.over05.minOdd}`,
        suggestedValue: "1.60-1.89",
        reason: `Odds 1.60-1.89 performam melhor (${formatRoi(sweetOdd.roiAverage)} avg) vs other sampled bands.`,
        confidence: computeRecommendationConfidence(sweetOdd, "positive"),
        supportingData: { sweetOdd, compareTarget },
      });
    }
  }

  if (isRisky(lowOdd) && isProfitable(sweetOdd)) {
    suggestions.push({
      type: "THRESHOLD",
      metric: "min_odd_over05",
      currentValue: ENGINE_THRESHOLDS.over05.minOdd,
      suggestedValue: 1.6,
      reason: `Odds 1.30-1.59 underperform (${formatRoi(lowOdd.roiAverage)} avg) while 1.60-1.89 are profitable.`,
      confidence: computeRecommendationConfidence(lowOdd, "negative"),
      supportingData: { lowOdd, sweetOdd },
    });
  }

  return suggestions;
}

function buildMarketInsights(
  summary: SignalAnalyticsSummary,
  segmentations: SignalSegmentationDocument
): ModelRecommendation[] {
  const insights: ModelRecommendation[] = [];

  for (const market of ["OVER_0_5", "OVER_1_5"] as MarketType[]) {
    const bucket = summary.byMarket[market];
    const seg = segmentations.byMarket[market];

    if (bucket.totalSignals < MIN_SAMPLE_SIZE) continue;

    const polarity = bucket.roiTotal >= 0 ? "positive" : "negative";
    const metrics: SegmentMetrics = {
      totalSignals: seg.totalSignals || bucket.totalSignals,
      hitRate: bucket.hitRate,
      roiTotal: bucket.roiTotal,
      roiAverage: bucket.roiAverage,
      avgPressure: seg.avgPressure || summary.totals.averagePressure,
      avgOdd: seg.avgOdd || summary.totals.averageOdd,
      avgMinute: seg.avgMinute,
      bestStreak: seg.bestStreak,
      worstStreak: seg.worstStreak,
    };

    insights.push({
      type: "MARKET",
      metric: `market_${market}`,
      currentValue: market,
      suggestedValue:
        polarity === "positive" ? "maintain_weight" : "review_rules",
      reason: `${market}: ${bucket.totalSignals} signals, ${formatPct(bucket.hitRate)} hit rate, ${formatRoi(bucket.roiTotal)} total ROI (${formatRoi(bucket.roiAverage)} avg).`,
      confidence: computeRecommendationConfidence(
        metrics,
        polarity === "positive" ? "positive" : "negative"
      ),
      supportingData: {
        market,
        summaryBucket: bucket,
        segmentation: seg,
      },
    });
  }

  const over05 = segmentations.byMarket.OVER_0_5;
  const over15 = segmentations.byMarket.OVER_1_5;

  if (
    over05.totalSignals >= MIN_SAMPLE_SIZE &&
    over15.totalSignals >= MIN_SAMPLE_SIZE &&
    over05.roiAverage !== over15.roiAverage
  ) {
    const better = over05.roiAverage > over15.roiAverage ? over05 : over15;
    const worse = over05.roiAverage > over15.roiAverage ? over15 : over05;
    const betterKey = over05.roiAverage > over15.roiAverage ? "OVER_0_5" : "OVER_1_5";

    insights.push({
      type: "MARKET",
      metric: "market_priority",
      currentValue: "equal_weight",
      suggestedValue: `favor_${betterKey}`,
      reason: `${betterKey} delivers higher avg ROI (${formatRoi(better.roiAverage)} vs ${formatRoi(worse.roiAverage)}).`,
      confidence: Math.min(
        computeRecommendationConfidence(
          { ...better, totalSignals: better.totalSignals } as SegmentMetrics,
          "positive"
        ),
        70
      ),
      supportingData: { over05, over15, betterKey },
    });
  }

  return insights;
}

function buildConfidenceInsightsFromSegmentation(
  segmentations: SignalSegmentationDocument
): ModelRecommendation[] {
  const medium = segmentations.byConfidence.MEDIUM;
  const high = segmentations.byConfidence.HIGH;
  return buildConfidenceInsightsCore(medium, high, null, null);
}

function buildConfidenceInsights(
  summary: SignalAnalyticsSummary,
  segmentations: SignalSegmentationDocument
): ModelRecommendation[] {
  return buildConfidenceInsightsCore(
    segmentations.byConfidence.MEDIUM,
    segmentations.byConfidence.HIGH,
    summary.byConfidence.MEDIUM,
    summary.byConfidence.HIGH
  );
}

function buildConfidenceInsightsCore(
  medium: SegmentMetrics,
  high: SegmentMetrics,
  mediumSummary: SignalAnalyticsSummary["byConfidence"]["MEDIUM"] | null,
  highSummary: SignalAnalyticsSummary["byConfidence"]["HIGH"] | null
): ModelRecommendation[] {
  const insights: ModelRecommendation[] = [];

  if (
    medium.totalSignals >= MIN_SAMPLE_SIZE &&
    high.totalSignals >= MIN_SAMPLE_SIZE
  ) {
    const ratio =
      high.roiAverage > 0 && medium.roiAverage > 0
        ? round(high.roiAverage / medium.roiAverage)
        : high.roiAverage / Math.max(0.01, Math.abs(medium.roiAverage));

    if (high.roiAverage > medium.roiAverage * 1.25) {
      insights.push({
        type: "CONFIDENCE",
        metric: "confidence_tier_efficiency",
        currentValue: "MEDIUM + HIGH",
        suggestedValue: "favor_HIGH",
        reason: `HIGH confidence apresenta ROI ~${ratio}x superior a MEDIUM (${formatRoi(high.roiAverage)} vs ${formatRoi(medium.roiAverage)} avg).`,
        confidence: Math.min(
          computeRecommendationConfidence(high, "positive"),
          computeRecommendationConfidence(medium, "positive")
        ),
        supportingData: {
          high,
          medium,
          roiMultiplier: ratio,
          highSummary,
          mediumSummary,
        },
      });
    }

    if (high.roiAverage < medium.roiAverage && isRisky(high)) {
      insights.push({
        type: "CONFIDENCE",
        metric: "high_confidence_calibration",
        currentValue: `pressure >= ${ENGINE_THRESHOLDS.over05.highPressure}`,
        suggestedValue: "review_HIGH_criteria",
        reason: `HIGH confidence underperforms MEDIUM (${formatRoi(high.roiAverage)} vs ${formatRoi(medium.roiAverage)}). High-pressure tier may be miscalibrated.`,
        confidence: computeRecommendationConfidence(high, "negative"),
        supportingData: { high, medium },
      });
    }
  }

  if (isProfitable(high)) {
    insights.push({
      type: "CONFIDENCE",
      metric: "high_confidence_band",
      currentValue: "HIGH",
      suggestedValue: "expand_HIGH_when_pressure_80_89",
      reason: `HIGH confidence segment is empirically profitable (${formatRoi(high.roiTotal)} total, ${formatPct(high.hitRate)} HR).`,
      confidence: computeRecommendationConfidence(high, "positive"),
      supportingData: { high, highSummary },
    });
  }

  if (isRisky(medium)) {
    insights.push({
      type: "CONFIDENCE",
      metric: "medium_confidence_band",
      currentValue: "MEDIUM",
      suggestedValue: "tighten_MEDIUM_entry_filters",
      reason: `MEDIUM confidence shows negative ROI (${formatRoi(medium.roiTotal)}). Consider stricter minute/odd filters for MEDIUM tier.`,
      confidence: computeRecommendationConfidence(medium, "negative"),
      supportingData: { medium, mediumSummary },
    });
  }

  return insights;
}

function buildComparativeInsights(
  entries: SegmentEntry[]
): ModelRecommendation[] {
  const comparatives: ModelRecommendation[] = [];

  const pressureBest = findBestAndWorst(entries, "pressure");
  if (pressureBest.best && pressureBest.worst) {
    const rec = buildComparativeRecommendation(
      pressureBest.best,
      pressureBest.worst,
      "Pressure band comparison"
    );
    if (rec) comparatives.push(rec);
  }

  const minuteBest = findBestAndWorst(entries, "minute");
  if (minuteBest.best && minuteBest.worst) {
    const rec = buildComparativeRecommendation(
      minuteBest.best,
      minuteBest.worst,
      "Minute window comparison"
    );
    if (rec) comparatives.push(rec);
  }

  const oddBest = findBestAndWorst(entries, "odd");
  if (oddBest.best && oddBest.worst) {
    const rec = buildComparativeRecommendation(
      oddBest.best,
      oddBest.worst,
      "Odd range comparison"
    );
    if (rec) comparatives.push(rec);
  }

  const p89 = entries.find((e) => e.dimension === "pressure" && e.key === "80-89");
  const p90 = entries.find((e) => e.dimension === "pressure" && e.key === "90+");
  if (p89 && p90 && p89.metrics.totalSignals >= MIN_SAMPLE_SIZE) {
    const rec = buildComparativeRecommendation(
      p89.metrics.roiAverage >= p90.metrics.roiAverage ? p89 : p90,
      p89.metrics.roiAverage >= p90.metrics.roiAverage ? p90 : p89,
      "Pressure 90+ vs 80-89"
    );
    if (rec) comparatives.push(rec);
  }

  return comparatives;
}

function buildDocument(
  summary: SignalAnalyticsSummary | null,
  segmentations: SignalSegmentationDocument | null
): ModelRecommendationsDocument {
  const empty: ModelRecommendationsDocument = {
    generatedAt: new Date().toISOString(),
    profitablePatterns: [],
    riskyPatterns: [],
    thresholdSuggestions: [],
    marketInsights: [],
    confidenceInsights: [],
  };

  if (!segmentations) return empty;

  const entries = collectSegmentEntries(segmentations);

  const profitablePatterns = entries
    .filter((e) => isProfitable(e.metrics))
    .map(buildProfitableRecommendation)
    .filter((r) => r.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence);

  const riskyPatterns = entries
    .filter((e) => isRisky(e.metrics))
    .map(buildRiskyRecommendation)
    .filter((r) => r.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence);

  const thresholdSuggestions = buildThresholdSuggestions(segmentations).filter(
    (r) => r.confidence > 0
  );

  const comparatives = buildComparativeInsights(entries);
  const mergedThresholds = [...thresholdSuggestions, ...comparatives].sort(
    (a, b) => b.confidence - a.confidence
  );

  const marketInsights = summary
    ? buildMarketInsights(summary, segmentations).filter((r) => r.confidence > 0)
    : [];

  const confidenceInsights = (
    summary
      ? buildConfidenceInsights(summary, segmentations)
      : buildConfidenceInsightsFromSegmentation(segmentations)
  ).filter((r) => r.confidence > 0);

  return {
    generatedAt: new Date().toISOString(),
    profitablePatterns,
    riskyPatterns,
    thresholdSuggestions: mergedThresholds,
    marketInsights,
    confidenceInsights,
  };
}

/**
 * Reads analytics summary + segmentations and writes adaptive recommendations.
 */
export async function generateModelRecommendations(): Promise<GenerateModelRecommendationsResult> {
  const [summary, segmentations] = await Promise.all([
    readJsonFile<SignalAnalyticsSummary>(SUMMARY_PATH),
    readJsonFile<SignalSegmentationDocument>(SEGMENTATIONS_PATH),
  ]);

  if (!segmentations) {
    logWarn(LOG_SCOPE, "Segmentations file missing — skipping recommendations");
  }

  const document = buildDocument(summary, segmentations);
  const outputPath = path.join(ANALYTICS_DIR, OUTPUT_FILENAME);

  await writeFile(outputPath, JSON.stringify(document, null, 2), "utf8");

  logInfo(LOG_SCOPE, "Profitable patterns found", {
    count: document.profitablePatterns.length,
    top: document.profitablePatterns.slice(0, 3).map((r) => r.metric),
  });

  logInfo(LOG_SCOPE, "Risky patterns found", {
    count: document.riskyPatterns.length,
    top: document.riskyPatterns.slice(0, 3).map((r) => r.metric),
  });

  logInfo(LOG_SCOPE, "Recommendations generated", {
    outputPath,
    generatedAt: document.generatedAt,
    thresholdSuggestions: document.thresholdSuggestions.length,
    marketInsights: document.marketInsights.length,
    confidenceInsights: document.confidenceInsights.length,
  });

  return {
    document,
    outputPath,
    profitableCount: document.profitablePatterns.length,
    riskyCount: document.riskyPatterns.length,
  };
}
