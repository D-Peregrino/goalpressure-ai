import type { AdaptiveThresholds } from "@/lib/learning/adaptiveLearning.types";
import { DEFAULT_THRESHOLDS } from "@/lib/learning/adaptiveLearningConfig";

let thresholds: AdaptiveThresholds = { ...DEFAULT_THRESHOLDS };
const recentAdjustments: string[] = [];

export function getAdaptiveThresholds(): AdaptiveThresholds {
  return { ...thresholds };
}

export function runSelfCalibration(params: {
  contextualAccuracyPct: number;
  predictiveAccuracyPct: number;
  falsePositivePct: number;
  chaoticLeagueShare: number;
}): AdaptiveThresholds {
  const next = { ...thresholds };
  const notes: string[] = [];

  if (params.falsePositivePct > 35) {
    next.autonomousSensitivity = Math.max(0.82, next.autonomousSensitivity - 0.06);
    next.predictiveSensitivity = Math.max(0.85, next.predictiveSensitivity - 0.05);
    next.minContextScore = Math.min(78, next.minContextScore + 3);
    notes.push("Sensibilidade reduzida — falso positivo elevado");
  } else if (params.contextualAccuracyPct >= 68 && params.falsePositivePct < 22) {
    next.autonomousSensitivity = Math.min(1.15, next.autonomousSensitivity + 0.04);
    notes.push("Sensibilidade levemente elevada — assertividade contextual estável");
  }

  if (params.predictiveAccuracyPct >= 65) {
    next.minPredictiveBreak = Math.max(52, next.minPredictiveBreak - 2);
    notes.push("Limiar preditivo ajustado para captar antecipações válidas");
  } else if (params.predictiveAccuracyPct < 45) {
    next.minPredictiveBreak = Math.min(72, next.minPredictiveBreak + 4);
    notes.push("Limiar preditivo elevado — leituras preditivas abaixo da média");
  }

  if (params.chaoticLeagueShare > 0.45) {
    next.pressureGate = Math.min(78, next.pressureGate + 4);
    next.decisionConfidenceCap = Math.min(88, next.decisionConfidenceCap - 3);
    notes.push("Ligas caóticas dominantes — thresholds mais conservadores");
  }

  thresholds = next;
  for (const n of notes) {
    recentAdjustments.unshift(`${new Date().toISOString().slice(11, 19)} · ${n}`);
  }
  if (recentAdjustments.length > 12) recentAdjustments.length = 12;

  return next;
}

export function getRecentAdjustments(): string[] {
  return [...recentAdjustments];
}
