/**
 * Quantitative segmentation — discovers which pressure/minute/odd/confidence
 * combinations produce positive ROI empirically.
 */

import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { MarketType, SignalConfidence } from "@/types/domain";
import type { SignalOutcomeRecord } from "@/lib/storage/signalOutcomeStorage";
import type { PressureRangeKey } from "@/lib/analytics/signalAnalytics";
import { logInfo, logWarn } from "@/lib/utils/logger";

const LOG_SCOPE = "signal-segmentation";
const SIGNALS_DIR = path.join(process.cwd(), "data", "signals");
const ANALYTICS_DIR = path.join(process.cwd(), "data", "analytics");
const SEGMENTATIONS_FILENAME = "segmentations.json";

export type MinuteRangeKey =
  | "0-15"
  | "16-30"
  | "31-45"
  | "46-60"
  | "61-75"
  | "76-90+";

export type OddRangeKey =
  | "1.30-1.59"
  | "1.60-1.89"
  | "1.90-2.29"
  | "2.30+";

export interface SegmentMetrics {
  totalSignals: number;
  hitRate: number;
  roiTotal: number;
  roiAverage: number;
  avgPressure: number;
  avgOdd: number;
  avgMinute: number;
  bestStreak: number;
  worstStreak: number;
}

export interface SignalSegmentationDocument {
  generatedAt: string;
  byMinuteRange: Record<MinuteRangeKey, SegmentMetrics>;
  byPressureRange: Record<PressureRangeKey, SegmentMetrics>;
  byOddRange: Record<OddRangeKey, SegmentMetrics>;
  byConfidence: Record<SignalConfidence, SegmentMetrics>;
  byMarket: Record<MarketType, SegmentMetrics>;
}

export interface GenerateSignalSegmentationsResult {
  document: SignalSegmentationDocument;
  segmentsProcessed: number;
  profitableSegments: number;
  outputPath: string;
}

const MINUTE_RANGE_KEYS: MinuteRangeKey[] = [
  "0-15",
  "16-30",
  "31-45",
  "46-60",
  "61-75",
  "76-90+",
];

const PRESSURE_RANGE_KEYS: PressureRangeKey[] = [
  "60-69",
  "70-79",
  "80-89",
  "90+",
];

const ODD_RANGE_KEYS: OddRangeKey[] = [
  "1.30-1.59",
  "1.60-1.89",
  "1.90-2.29",
  "2.30+",
];

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

function emptySegmentMetrics(): SegmentMetrics {
  return {
    totalSignals: 0,
    hitRate: 0,
    roiTotal: 0,
    roiAverage: 0,
    avgPressure: 0,
    avgOdd: 0,
    avgMinute: 0,
    bestStreak: 0,
    worstStreak: 0,
  };
}

export function getMinuteRange(minute: number): MinuteRangeKey | null {
  if (minute <= 15) return "0-15";
  if (minute <= 30) return "16-30";
  if (minute <= 45) return "31-45";
  if (minute <= 60) return "46-60";
  if (minute <= 75) return "61-75";
  if (minute >= 76) return "76-90+";
  return null;
}

export function getOddRange(odd: number): OddRangeKey | null {
  if (odd >= 1.3 && odd < 1.6) return "1.30-1.59";
  if (odd >= 1.6 && odd < 1.9) return "1.60-1.89";
  if (odd >= 1.9 && odd < 2.3) return "1.90-2.29";
  if (odd >= 2.3) return "2.30+";
  return null;
}

export function getPressureRangeForSegmentation(
  pressure: number
): PressureRangeKey | null {
  if (pressure >= 90) return "90+";
  if (pressure >= 80) return "80-89";
  if (pressure >= 70) return "70-79";
  if (pressure >= 60) return "60-69";
  return null;
}

function resolveRoi(record: SignalOutcomeRecord): number {
  if (record.roi != null) return record.roi;
  if (record.outcome === "HIT") return record.triggerOdds - 1;
  return -1;
}

function computeStreaks(
  resolved: SignalOutcomeRecord[]
): { bestStreak: number; worstStreak: number } {
  const sorted = [...resolved]
    .filter((r) => r.outcome != null && r.resolvedAt)
    .sort(
      (a, b) =>
        new Date(a.resolvedAt!).getTime() - new Date(b.resolvedAt!).getTime()
    );

  let bestStreak = 0;
  let currentHit = 0;
  let worstStreak = 0;
  let currentMiss = 0;

  for (const record of sorted) {
    if (record.outcome === "HIT") {
      currentHit += 1;
      currentMiss = 0;
      bestStreak = Math.max(bestStreak, currentHit);
    } else {
      currentMiss += 1;
      currentHit = 0;
      worstStreak = Math.max(worstStreak, currentMiss);
    }
  }

  return { bestStreak, worstStreak };
}

function computeSegmentMetrics(records: SignalOutcomeRecord[]): SegmentMetrics {
  if (records.length === 0) return emptySegmentMetrics();

  const resolved = records.filter(
    (r) => r.status === "RESOLVED" && r.outcome != null
  );
  const hits = resolved.filter((r) => r.outcome === "HIT");
  const roiValues = resolved.map(resolveRoi);
  const roiTotal = roiValues.reduce((sum, v) => sum + v, 0);
  const { bestStreak, worstStreak } = computeStreaks(resolved);

  return {
    totalSignals: records.length,
    hitRate:
      resolved.length > 0 ? round(hits.length / resolved.length) : 0,
    roiTotal: round(roiTotal),
    roiAverage:
      resolved.length > 0 ? round(roiTotal / resolved.length) : 0,
    avgPressure: round(average(records.map((r) => r.triggerPressure))),
    avgOdd: round(average(records.map((r) => r.triggerOdds))),
    avgMinute: round(average(records.map((r) => r.triggerMinute))),
    bestStreak,
    worstStreak,
  };
}

function buildEmptyByMinuteRange(): Record<MinuteRangeKey, SegmentMetrics> {
  return Object.fromEntries(
    MINUTE_RANGE_KEYS.map((key) => [key, emptySegmentMetrics()])
  ) as Record<MinuteRangeKey, SegmentMetrics>;
}

function buildEmptyByPressureRange(): Record<PressureRangeKey, SegmentMetrics> {
  return Object.fromEntries(
    PRESSURE_RANGE_KEYS.map((key) => [key, emptySegmentMetrics()])
  ) as Record<PressureRangeKey, SegmentMetrics>;
}

function buildEmptyByOddRange(): Record<OddRangeKey, SegmentMetrics> {
  return Object.fromEntries(
    ODD_RANGE_KEYS.map((key) => [key, emptySegmentMetrics()])
  ) as Record<OddRangeKey, SegmentMetrics>;
}

function buildEmptyByConfidence(): Record<SignalConfidence, SegmentMetrics> {
  return {
    MEDIUM: emptySegmentMetrics(),
    HIGH: emptySegmentMetrics(),
  };
}

function buildEmptyByMarket(): Record<MarketType, SegmentMetrics> {
  return {
    OVER_0_5: emptySegmentMetrics(),
    OVER_1_5: emptySegmentMetrics(),
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

function buildSegmentationDocument(
  records: SignalOutcomeRecord[]
): SignalSegmentationDocument {
  const byMinuteRange = buildEmptyByMinuteRange();
  const byPressureRange = buildEmptyByPressureRange();
  const byOddRange = buildEmptyByOddRange();
  const byConfidence = buildEmptyByConfidence();
  const byMarket = buildEmptyByMarket();

  const minuteGroups = new Map<MinuteRangeKey, SignalOutcomeRecord[]>();
  const pressureGroups = new Map<PressureRangeKey, SignalOutcomeRecord[]>();
  const oddGroups = new Map<OddRangeKey, SignalOutcomeRecord[]>();
  const confidenceGroups = new Map<SignalConfidence, SignalOutcomeRecord[]>();
  const marketGroups = new Map<MarketType, SignalOutcomeRecord[]>();

  for (const record of records) {
    const minuteKey = getMinuteRange(record.triggerMinute);
    if (minuteKey) {
      const list = minuteGroups.get(minuteKey) ?? [];
      list.push(record);
      minuteGroups.set(minuteKey, list);
    }

    const pressureKey = getPressureRangeForSegmentation(record.triggerPressure);
    if (pressureKey) {
      const list = pressureGroups.get(pressureKey) ?? [];
      list.push(record);
      pressureGroups.set(pressureKey, list);
    }

    const oddKey = getOddRange(record.triggerOdds);
    if (oddKey) {
      const list = oddGroups.get(oddKey) ?? [];
      list.push(record);
      oddGroups.set(oddKey, list);
    }

    const confList = confidenceGroups.get(record.confidence) ?? [];
    confList.push(record);
    confidenceGroups.set(record.confidence, confList);

    const marketList = marketGroups.get(record.market) ?? [];
    marketList.push(record);
    marketGroups.set(record.market, marketList);
  }

  for (const [key, group] of minuteGroups) {
    byMinuteRange[key] = computeSegmentMetrics(group);
  }

  for (const [key, group] of pressureGroups) {
    byPressureRange[key] = computeSegmentMetrics(group);
  }

  for (const [key, group] of oddGroups) {
    byOddRange[key] = computeSegmentMetrics(group);
  }

  for (const [key, group] of confidenceGroups) {
    byConfidence[key] = computeSegmentMetrics(group);
  }

  for (const [key, group] of marketGroups) {
    byMarket[key] = computeSegmentMetrics(group);
  }

  return {
    generatedAt: new Date().toISOString(),
    byMinuteRange,
    byPressureRange,
    byOddRange,
    byConfidence,
    byMarket,
  };
}

function countProfitableSegments(document: SignalSegmentationDocument): {
  count: number;
  labels: string[];
} {
  const labels: string[] = [];

  const check = (dimension: string, key: string, metrics: SegmentMetrics) => {
    if (metrics.totalSignals > 0 && metrics.roiTotal > 0) {
      labels.push(`${dimension}:${key}`);
    }
  };

  for (const [key, metrics] of Object.entries(document.byMinuteRange)) {
    check("minute", key, metrics);
  }
  for (const [key, metrics] of Object.entries(document.byPressureRange)) {
    check("pressure", key, metrics);
  }
  for (const [key, metrics] of Object.entries(document.byOddRange)) {
    check("odd", key, metrics);
  }
  for (const [key, metrics] of Object.entries(document.byConfidence)) {
    check("confidence", key, metrics);
  }
  for (const [key, metrics] of Object.entries(document.byMarket)) {
    check("market", key, metrics);
  }

  return { count: labels.length, labels };
}

function countSegmentsProcessed(document: SignalSegmentationDocument): number {
  return (
    Object.keys(document.byMinuteRange).length +
    Object.keys(document.byPressureRange).length +
    Object.keys(document.byOddRange).length +
    Object.keys(document.byConfidence).length +
    Object.keys(document.byMarket).length
  );
}

/**
 * Reads all signal files, segments by minute/pressure/odd/confidence/market,
 * and writes `data/analytics/segmentations.json`.
 */
export async function generateSignalSegmentations(
  records?: SignalOutcomeRecord[]
): Promise<GenerateSignalSegmentationsResult> {
  await ensureAnalyticsDir();

  const signalRecords = records ?? (await loadSignalRecords());
  const document = buildSegmentationDocument(signalRecords);
  const outputPath = path.join(ANALYTICS_DIR, SEGMENTATIONS_FILENAME);

  await writeFile(outputPath, JSON.stringify(document, null, 2), "utf8");

  const segmentsProcessed = countSegmentsProcessed(document);
  const { count: profitableSegments, labels } = countProfitableSegments(document);

  logInfo(LOG_SCOPE, "Segments processed", {
    signals: signalRecords.length,
    segmentsProcessed,
  });

  logInfo(LOG_SCOPE, "Profitable segments found", {
    count: profitableSegments,
    segments: labels,
  });

  logInfo(LOG_SCOPE, "Segmentation generated", {
    outputPath,
    generatedAt: document.generatedAt,
    profitableSegments,
  });

  return {
    document,
    segmentsProcessed,
    profitableSegments,
    outputPath,
  };
}
