import type { AutonomousAlertPriority } from "@/lib/autonomous/autonomousAlert.types";
import { detectPatternsForMatch } from "@/lib/learning/patternMemory";
import { getCompositeSignalWeight } from "@/lib/learning/learningWeights";
import { getAdaptiveThresholds } from "@/lib/learning/selfCalibration";
import type { Match } from "@/types/domain";
import { evaluateMatchContext } from "@/components/terminal/intelligence/ContextEngine";
import { matchToContextMatch } from "@/lib/autonomous/matchContextBridge";

const PRIORITY_ORDER: AutonomousAlertPriority[] = [
  "baixa",
  "moderada",
  "alta",
  "critica",
];

function bumpPriority(p: AutonomousAlertPriority, steps: number): AutonomousAlertPriority {
  const idx = Math.min(PRIORITY_ORDER.length - 1, PRIORITY_ORDER.indexOf(p) + steps);
  return PRIORITY_ORDER[idx] ?? p;
}

function lowerPriority(p: AutonomousAlertPriority, steps: number): AutonomousAlertPriority {
  const idx = Math.max(0, PRIORITY_ORDER.indexOf(p) - steps);
  return PRIORITY_ORDER[idx] ?? p;
}

/** Reclassificação adaptativa de prioridade (alertas / dispatch). */
export function applyAdaptiveAlertPriority(
  base: AutonomousAlertPriority,
  match: Match
): AutonomousAlertPriority {
  const ctx = evaluateMatchContext(matchToContextMatch(match) as import("@/hooks/useLiveMatchCenter").EnrichedLiveMatch);
  const patterns = detectPatternsForMatch(match);
  const weight = getCompositeSignalWeight({
    league: match.league,
    contextLevel: ctx.level,
    patterns,
  });

  if (weight >= 1.1) return bumpPriority(base, 1);
  if (weight <= 0.88) return lowerPriority(base, 1);
  return base;
}

export function shouldBoostPredictiveDispatch(match: Match): boolean {
  const t = getAdaptiveThresholds();
  const ctx = evaluateMatchContext(matchToContextMatch(match) as import("@/hooks/useLiveMatchCenter").EnrichedLiveMatch);
  return ctx.score >= t.minContextScore * t.predictiveSensitivity;
}

export function getAdaptiveConfidenceCap(): number {
  return getAdaptiveThresholds().decisionConfidenceCap;
}
