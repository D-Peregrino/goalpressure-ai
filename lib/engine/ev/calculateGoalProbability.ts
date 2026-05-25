import type { Match } from "@/types/domain";
import type { OffensivePressureResult } from "@/lib/engine/pressure/pressure.types";
import type { GoalProbabilities, ProprietaryXgResult } from "@/lib/engine/ev/ev.types";
import { calculateExpectedGoals } from "@/lib/engine/ev/calculateExpectedGoals";

function clamp(v: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, v));
}

/**
 * Probabilidades live derivadas de pressão + stats (0–100 cada).
 */
export function calculateGoalProbability(
  match: Match,
  pressure: OffensivePressureResult,
  xg?: ProprietaryXgResult
): GoalProbabilities {
  const xgResult = xg ?? calculateExpectedGoals(match, pressure);
  const minute = match.minute;
  const totalGoals = (match.score?.home ?? 0) + (match.score?.away ?? 0);
  const trend =
    match.pressure.trend === "RISING"
      ? 8
      : match.pressure.trend === "FALLING"
        ? -6
        : 0;

  const pressureFactor = pressure.pressureScore * 0.42;
  const momentumFactor = pressure.momentumScore * 0.22;
  const accelFactor = pressure.accelerationScore * 0.14;
  const territorialFactor = pressure.territorialScore * 0.12;
  const xgFactor = clamp(xgResult.live * 22, 0, 35);
  const sotFactor = clamp(match.stats.shotsOnTarget * 4.5, 0, 25);
  const daFactor = clamp(match.stats.dangerousAttacks * 1.1, 0, 20);
  const cornerFactor = clamp(match.stats.corners * 2.2, 0, 12);

  const minuteOver05 =
    minute < 20 ? 0.88 : minute > 75 ? 0.92 : minute > 60 ? 1.05 : 1;
  const minuteLate = minute >= 70 ? 1.15 + (minute - 70) * 0.02 : 0.65;

  const overLiveBase =
    pressureFactor +
    momentumFactor +
    accelFactor +
    territorialFactor +
    xgFactor +
    sotFactor * 0.5 +
    trend;

  const overLive = clamp(overLiveBase * minuteOver05);
  const oneGoal = clamp(overLive * 0.92);
  const twoPlus = clamp(
    overLive * 0.55 +
      xgFactor * 0.8 +
      (totalGoals >= 1 ? 25 : 0) +
      accelFactor * 0.35
  );
  const lateGoal = clamp(
    (pressure.pressureScore * 0.35 +
      pressure.momentumScore * 0.25 +
      accelFactor * 0.2) *
      minuteLate +
      (totalGoals === 0 ? 12 : 5)
  );

  const over05 = clamp(oneGoal * 1.02);
  const over15 = clamp(twoPlus * 0.95);

  return {
    oneGoal: Math.round(oneGoal),
    twoPlusGoals: Math.round(twoPlus),
    lateGoal: Math.round(lateGoal),
    overLive: Math.round(overLive),
    over05: Math.round(over05),
    over15: Math.round(over15),
  };
}

/** Probabilidade principal exibida (over 0.5 live). */
export function primaryGoalProbability(probs: GoalProbabilities): number {
  return probs.over05;
}
