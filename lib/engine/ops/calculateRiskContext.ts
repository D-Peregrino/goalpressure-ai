import type { OpsEngineInput, RiskContext } from "@/lib/engine/ops/ops.types";
import { detectChaosLevel } from "@/lib/engine/ops/detectChaosLevel";

export function calculateRiskContext(input: OpsEngineInput): RiskContext {
  const m = input.match;
  const p = input.pressure?.pressureScore ?? m.pressure.score;
  const a = input.pressure?.accelerationScore ?? 0;
  const trend = m.pressure.trend;
  const ev = input.ev?.expectedValue.best;
  const distortion = input.ev?.distortion.level;
  const { level: chaos } = detectChaosLevel(input);
  const terr = input.pressure?.territorialScore ?? 0;
  const sot = m.stats.shotsOnTarget;
  const da = m.stats.dangerousAttacks;

  let riskScore = 0;

  if (ev && ev.evPercent < 0) riskScore += 35;
  if (distortion === "LOW" && p >= 70) riskScore += 22;
  if (p >= 75 && sot < 2 && da >= 15) riskScore += 28;
  if (trend === "FALLING" && p >= 50) riskScore += 18;
  if (chaos >= 75 && ev && ev.evPercent < 2) riskScore += 15;
  if (p >= 80 && a >= 85 && terr < 40) riskScore += 20;
  if (m.odds.primary < 1.15 && p >= 60) riskScore += 25;

  if (riskScore >= 55) return "DANGEROUS";
  if (riskScore >= 38) return "HIGH";
  if (riskScore >= 18) return "MODERATE";
  return "LOW";
}

export function riskContextLabel(risk: RiskContext): string {
  const map: Record<RiskContext, string> = {
    LOW: "Risco controlado",
    MODERATE: "Risco moderado",
    HIGH: "Risco elevado",
    DANGEROUS: "Cenário de armadilha",
  };
  return map[risk];
}
