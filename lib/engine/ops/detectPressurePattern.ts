import type { OpsEngineInput, PressurePattern } from "@/lib/engine/ops/ops.types";

export function detectPressurePattern(input: OpsEngineInput): PressurePattern {
  const m = input.match;
  const p = input.pressure?.pressureScore ?? m.pressure.score;
  const a = input.pressure?.accelerationScore ?? 0;
  const mom = input.pressure?.momentumScore ?? 0;
  const trend = m.pressure.trend;
  const minute = m.minute;
  const totalGoals = (m.score?.home ?? 0) + (m.score?.away ?? 0);
  const corners = m.stats.corners;

  if (minute >= 75 && p >= 65 && totalGoals <= 1) return "DESPERATION_PRESSURE";
  if (trend === "FALLING" && p < 45) return "PRESSURE_DROP";
  if (trend === "RISING" && a >= 60) return "MOMENTUM_SPIKE";
  if (corners >= 6 && p >= 50) return "CORNER_PRESSURE";
  if (p >= 60 && mom >= 55 && trend !== "FALLING") return "SUSTAINED_PRESSURE";
  if (m.stats.shots >= 8 && p >= 45) return "REPEATED_ATTACKS";
  if (totalGoals >= 1 && p >= 55 && trend === "RISING") return "COMEBACK_PUSH";
  return "NEUTRAL";
}

export function pressurePatternLabel(pattern: PressurePattern): string {
  const map: Record<PressurePattern, string> = {
    SUSTAINED_PRESSURE: "Pressão sustentada",
    REPEATED_ATTACKS: "Ataques repetidos",
    CORNER_PRESSURE: "Pressão por escanteios",
    MOMENTUM_SPIKE: "Pico de momentum",
    PRESSURE_DROP: "Queda de pressão",
    COMEBACK_PUSH: "Reação ofensiva",
    DESPERATION_PRESSURE: "Pressão de desespero",
    NEUTRAL: "Ritmo estável",
  };
  return map[pattern];
}
