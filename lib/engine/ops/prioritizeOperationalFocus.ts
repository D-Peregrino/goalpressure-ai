import type {
  OperationalFocusRanking,
  OperationalInsightResult,
  OpsEngineInput,
} from "@/lib/engine/ops/ops.types";
import { runOperationalIntelligenceForMatch } from "@/lib/engine/ops/runOperationalIntelligence";

/**
 * Ranqueia jogos para foco principal, secundários e alertas.
 */
export function prioritizeOperationalFocus(
  inputs: OpsEngineInput[]
): OperationalFocusRanking {
  const all = inputs
    .map((input) => runOperationalIntelligenceForMatch(input))
    .sort((a, b) => b.focusScore - a.focusScore);

  return {
    primary: all[0] ?? null,
    secondary: all.slice(1, 4),
    all,
  };
}

export function computeFocusScore(
  insight: OperationalInsightResult,
  evPercent?: number
): number {
  let s = insight.focusScore;
  if (evPercent != null && evPercent > 0) s += Math.min(25, evPercent * 1.5);
  const tempBoost: Record<string, number> = {
    IGNITE: 30,
    HOT: 18,
    WARM: 8,
    COLD: 0,
  };
  s += tempBoost[insight.temperature] ?? 0;
  if (insight.riskContext === "DANGEROUS") s *= 0.75;
  return Math.round(s);
}
