import type { AdaptivePatternId } from "@/lib/learning/adaptiveLearning.types";
import { getPatternWeight } from "@/lib/learning/patternMemory";
import { getLeagueWeight } from "@/lib/learning/leagueReliability";
import { getAdaptiveThresholds } from "@/lib/learning/selfCalibration";

const CONTEXT_WEIGHTS: Record<string, number> = {
  neutro: 0.92,
  monitoramento: 1,
  pressao_crescente: 1.06,
  zona_critica: 1.1,
  oportunidade_ev: 1.08,
  desaceleracao: 0.9,
};

export function getContextLevelWeight(level: string): number {
  const base = CONTEXT_WEIGHTS[level] ?? 1;
  const t = getAdaptiveThresholds();
  return base * t.autonomousSensitivity;
}

export function getCompositeSignalWeight(params: {
  league: string;
  contextLevel: string;
  patterns: AdaptivePatternId[];
}): number {
  let w = getContextLevelWeight(params.contextLevel);
  w *= getLeagueWeight(params.league);
  for (const p of params.patterns) {
    w *= getPatternWeight(p, params.league);
  }
  return Math.max(0.75, Math.min(1.25, w));
}

export function getDecisionConfidenceMultiplier(league: string): number {
  const lw = getLeagueWeight(league);
  const cap = getAdaptiveThresholds().decisionConfidenceCap / 100;
  return Math.min(cap, lw);
}
