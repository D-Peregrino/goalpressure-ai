import type { ChaosClass, OpsEngineInput } from "@/lib/engine/ops/ops.types";

function clamp(v: number): number {
  return Math.min(100, Math.max(0, Math.round(v)));
}

export function classifyChaos(score: number): ChaosClass {
  if (score >= 80) return "EXTREME";
  if (score >= 60) return "HIGH";
  if (score >= 35) return "MEDIUM";
  return "LOW";
}

/**
 * Volatilidade ofensiva 0–100.
 */
export function detectChaosLevel(input: OpsEngineInput): {
  level: number;
  classification: ChaosClass;
} {
  const m = input.match;
  const p = input.pressure?.pressureScore ?? m.pressure.score;
  const a = input.pressure?.accelerationScore ?? 0;
  const mom = input.pressure?.momentumScore ?? 0;
  const ev = input.ev?.expectedValue.best?.evPercent ?? 0;

  const raw =
    a * 0.32 +
    mom * 0.28 +
    p * 0.15 +
    Math.min(40, m.stats.dangerousAttacks * 1.2) +
    Math.min(25, m.stats.corners * 2.5) +
    (m.pressure.trend === "RISING" ? 12 : 0) +
    Math.min(15, Math.abs(ev) * 0.8);

  const level = clamp(raw);
  return { level, classification: classifyChaos(level) };
}
