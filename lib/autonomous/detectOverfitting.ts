import type { AutonomousDecisionInput } from "@/lib/autonomous/autonomous.types";

function clamp(v: number): number {
  return Math.min(100, Math.max(0, Math.round(v)));
}

/**
 * Detecta overfitting / bias estatístico / amostra fraca.
 */
export function detectOverfitting(input: AutonomousDecisionInput): number {
  let risk = 0;
  const sample = input.leagueSampleSize ?? 0;
  const edge = input.match.learningContext?.historicalEdge.score ?? 0;
  const patterns = input.match.learningContext?.patterns.length ?? 0;
  const teamProfiles = input.match.learningContext?.teamProfiles.length ?? 0;

  if (sample < 4) risk += 35;
  else if (sample < 8) risk += 18;

  if (edge >= 78 && sample < 10) risk += 22;
  if (patterns >= 3 && sample < 6) risk += 20;
  if (teamProfiles >= 2 && sample < 5) risk += 15;

  const ev = input.match.evEngine?.expectedValue.best?.evPercent ?? 0;
  if (ev >= 12 && (input.globalAccuracy ?? 50) < 45) risk += 25;

  return clamp(risk);
}
