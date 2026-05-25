import type { Match } from "@/types/domain";
import type { OffensivePressureResult } from "@/lib/engine/pressure/pressure.types";
import type { ProprietaryXgResult } from "@/lib/engine/ev/ev.types";

function clamp(v: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, v));
}

function resolveSot(match: Match): number {
  if (match.stats.shotsOnTarget > 0) return match.stats.shotsOnTarget;
  return Math.max(0, Math.round(match.stats.shots * 0.38));
}

/**
 * xG proprietário live (sem xG externo SportMonks).
 */
export function calculateExpectedGoals(
  match: Match,
  pressure: OffensivePressureResult
): ProprietaryXgResult {
  const sot = resolveSot(match);
  const da = match.stats.dangerousAttacks;
  const minute = Math.max(1, match.minute);
  const rate = minute / 90;

  const base =
    sot * 0.14 +
    da * 0.018 +
    (pressure.territorialScore / 100) * 0.35 +
    (pressure.momentumScore / 100) * 0.28 +
    (pressure.accelerationScore / 100) * 0.22;

  const live = clamp(base * (0.85 + rate * 0.35), 0, 4.5);
  const trend = clamp(
    live - rate * (match.stats.shots * 0.02 + sot * 0.05),
    -1.5,
    2
  );
  const pressureXg = clamp(live * (pressure.pressureScore / 65), 0, 5);

  return {
    live: Math.round(live * 100) / 100,
    trend: Math.round(trend * 100) / 100,
    pressure: Math.round(pressureXg * 100) / 100,
  };
}
