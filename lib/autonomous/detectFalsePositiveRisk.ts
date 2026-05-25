import type { AutonomousDecisionInput } from "@/lib/autonomous/autonomous.types";

function clamp(v: number): number {
  return Math.min(100, Math.max(0, Math.round(v)));
}

/**
 * Risco de falso positivo 0–100.
 */
export function detectFalsePositiveRisk(input: AutonomousDecisionInput): number {
  const m = input.match;
  let risk = 0;

  const p = m.pressure?.score ?? 0;
  const ev = m.evEngine?.expectedValue.best?.evPercent ?? 0;
  const dist = m.evEngine?.distortion.level;
  const sot = m.stats.shotsOnTarget;
  const da = m.stats.dangerousAttacks;
  const accel = m.feedMeta?.offensiveEngine?.accelerationScore ?? 0;
  const terr = m.feedMeta?.offensiveEngine?.territorialScore ?? 0;

  if (p >= 72 && sot < 2 && da >= 14) risk += 28;
  if (ev >= 8 && dist === "LOW") risk += 22;
  if (accel >= 80 && terr < 45) risk += 18;
  if (m.opsIntelligence?.riskContext === "DANGEROUS") risk += 25;
  if (m.opsIntelligence?.pressurePattern === "PRESSURE_DROP" && p >= 50) {
    risk += 15;
  }
  if ((input.globalFalsePositiveRate ?? 0) > 50) risk += 12;
  if (m.learningContext?.patterns.some((p) => p.type === "FAKE_PRESSURE")) {
    risk += 14;
  }
  if (m.learningContext?.patterns.some((p) => p.type === "MARKET_TRAP")) {
    risk += 16;
  }

  return clamp(risk);
}
