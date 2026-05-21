/**
 * Experimental multi-model signal evaluation — runs in parallel for quantitative
 * A/B research without replacing the active production model.
 */

import { createHash } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import type { Match, Signal } from "@/types/domain";
import { loadAllModels } from "@/lib/models/modelLoader";
import { evaluateAllGamesWithModel } from "@/lib/signalEngine";
import { logInfo, logWarn } from "@/lib/utils/logger";

const LOG_SCOPE = "experimental-signal-engine";
const EXPERIMENTAL_DIR = path.join(process.cwd(), "data", "experimental");
const OUTPUT_FILENAME = "experimental-signals.json";

/** Minimum interval between persisted experimental snapshots (ms) */
const MIN_PERSIST_INTERVAL_MS = 90_000;

export interface ExperimentalModelMetrics {
  signalsGenerated: number;
  matchesAnalyzed: number;
  averageSignalPressure: number;
  averageSignalOdd: number;
  highConfidenceCount: number;
  mediumConfidenceCount: number;
}

export interface ExperimentalModelEvaluation {
  modelId: string;
  signals: Signal[];
  metrics: ExperimentalModelMetrics;
}

export interface ExperimentalModelSnapshot {
  modelId: string;
  signalsGenerated: number;
  matchesAnalyzed: number;
  signals: Signal[];
}

export interface ExperimentalSignalsDocument {
  timestamp: string;
  matchesAnalyzed: number;
  models: ExperimentalModelSnapshot[];
}

export interface EvaluateAllModelsResult {
  timestamp: string;
  evaluations: ExperimentalModelEvaluation[];
  modelsCompared: number;
}

let ensureDirPromise: Promise<void> | null = null;
let lastPersistAt = 0;
let lastFingerprint: string | null = null;

async function ensureExperimentalDir(): Promise<void> {
  if (!ensureDirPromise) {
    ensureDirPromise = mkdir(EXPERIMENTAL_DIR, { recursive: true }).then(
      () => undefined
    );
  }
  await ensureDirPromise;
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function buildMatchFingerprint(matches: Match[]): string {
  const payload = matches
    .map(
      (m) =>
        `${m.id}:${m.minute}:${m.pressure.score}:${m.stats.dangerousAttacks}:${m.stats.shots}`
    )
    .sort()
    .join("|");

  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

function shouldSkipPersist(matches: Match[]): boolean {
  if (matches.length === 0) return true;

  const now = Date.now();
  const fingerprint = buildMatchFingerprint(matches);

  if (
    lastFingerprint === fingerprint &&
    now - lastPersistAt < MIN_PERSIST_INTERVAL_MS
  ) {
    return true;
  }

  if (now - lastPersistAt < MIN_PERSIST_INTERVAL_MS && lastFingerprint != null) {
    return true;
  }

  return false;
}

function computeMetrics(
  matches: Match[],
  signals: Signal[]
): ExperimentalModelMetrics {
  return {
    signalsGenerated: signals.length,
    matchesAnalyzed: matches.length,
    averageSignalPressure: round(average(signals.map((s) => s.pressureScore))),
    averageSignalOdd: round(average(signals.map((s) => s.odd))),
    highConfidenceCount: signals.filter((s) => s.confidence === "HIGH").length,
    mediumConfidenceCount: signals.filter((s) => s.confidence === "MEDIUM")
      .length,
  };
}

/**
 * Evaluates all discovered models against the same live match set in parallel.
 */
export async function evaluateAllModels(
  matches: Match[]
): Promise<EvaluateAllModelsResult> {
  const models = await loadAllModels();

  logInfo(LOG_SCOPE, "Experimental models loaded", {
    count: models.length,
    modelIds: models.map((m) => m.modelId),
    matches: matches.length,
  });

  const evaluations: ExperimentalModelEvaluation[] = models.map((model) => {
    const signals = evaluateAllGamesWithModel(matches, model);
    return {
      modelId: model.modelId,
      signals,
      metrics: computeMetrics(matches, signals),
    };
  });

  logInfo(LOG_SCOPE, "Models compared live", {
    modelsCompared: evaluations.length,
    signalsByModel: evaluations.map((e) => ({
      modelId: e.modelId,
      count: e.metrics.signalsGenerated,
    })),
  });

  return {
    timestamp: new Date().toISOString(),
    evaluations,
    modelsCompared: evaluations.length,
  };
}

function toDocument(
  result: EvaluateAllModelsResult,
  matches: Match[]
): ExperimentalSignalsDocument {
  return {
    timestamp: result.timestamp,
    matchesAnalyzed: matches.length,
    models: result.evaluations.map((entry) => ({
      modelId: entry.modelId,
      signalsGenerated: entry.metrics.signalsGenerated,
      matchesAnalyzed: entry.metrics.matchesAnalyzed,
      signals: entry.signals,
    })),
  };
}

/**
 * Runs multi-model evaluation and persists `data/experimental/experimental-signals.json`.
 * Rate-limited to avoid duplicate processing on rapid API polls.
 */
export async function persistExperimentalSignals(
  matches: Match[]
): Promise<ExperimentalSignalsDocument | null> {
  if (shouldSkipPersist(matches)) {
    return null;
  }

  await ensureExperimentalDir();

  const result = await evaluateAllModels(matches);
  const document = toDocument(result, matches);
  const outputPath = path.join(EXPERIMENTAL_DIR, OUTPUT_FILENAME);

  await writeFile(outputPath, JSON.stringify(document, null, 2), "utf8");

  lastPersistAt = Date.now();
  lastFingerprint = buildMatchFingerprint(matches);

  logInfo(LOG_SCOPE, "Experimental signals generated", {
    outputPath,
    timestamp: document.timestamp,
    models: document.models.map((m) => ({
      modelId: m.modelId,
      signalsGenerated: m.signalsGenerated,
    })),
  });

  return document;
}

/** Fire-and-forget experimental pipeline — does not affect production signals. */
export function runExperimentalEvaluationAsync(matches: Match[]): void {
  if (matches.length === 0) return;

  void persistExperimentalSignals(matches).catch((error) => {
    const message = error instanceof Error ? error.message : "Unknown error";
    logWarn(LOG_SCOPE, "Experimental evaluation failed", { message });
  });
}
