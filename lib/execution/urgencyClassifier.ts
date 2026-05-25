import type {
  DispatchCandidate,
  DispatchUrgency,
} from "@/lib/execution/execution.types";

function clamp(v: number): number {
  return Math.min(100, Math.max(0, Math.round(v)));
}

export function classifyDispatchUrgency(
  candidate: DispatchCandidate
): { urgency: DispatchUrgency; priorityScore: number } {
  let score = 0;

  score += candidate.pressureScore * 0.25;
  score += candidate.momentumScore * 0.15;
  score += candidate.chaosLevel * 0.12;
  score += candidate.accelerationScore * 0.15;
  score += Math.max(0, candidate.evPercent ?? 0) * 2.2;
  score += candidate.confidence * 0.1;

  if (candidate.temperature === "IGNITE") score += 22;
  else if (candidate.temperature === "HOT") score += 12;
  if (candidate.gameState === "LATE_PRESSURE") score += 14;
  if (candidate.gameState === "CHAOTIC") score += 8;
  if (candidate.riskContext === "DANGEROUS") score -= 10;
  if (candidate.minute >= 70) score += 10;

  score = clamp(score);

  let urgency: DispatchUrgency = "LOW";
  if (score >= 82) urgency = "CRITICAL";
  else if (score >= 65) urgency = "HIGH";
  else if (score >= 42) urgency = "MEDIUM";

  return { urgency, priorityScore: score };
}

export function urgencyRank(u: DispatchUrgency): number {
  const map: Record<DispatchUrgency, number> = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };
  return map[u];
}
