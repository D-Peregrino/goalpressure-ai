/**
 * Seleciona melhor execução agora — apenas dados de market calibration + ops.
 */

import {
  resolveOperationalState,
  resolveOddPair,
  type OperationalState,
} from "@/lib/signals/executionWindow";

export interface MarketEdgeRow {
  market: string;
  marketOdd?: number;
  fairOdd?: number;
  edgePercent: number;
  expectedValue: number;
  steamMove?: boolean;
  oddsDrift?: number | null;
  classification?: string;
}

export interface BestExecutionPick {
  market: string;
  marketOdd: number;
  fairOdd: number | null;
  previousOdd: number | null;
  edgePercent: number;
  expectedValue: number;
  confidence: number;
  steamMove: boolean;
  oddsDrift: number | null;
  urgency: number;
  operationalState: OperationalState;
  windowLabel: string;
  score: number;
}

export interface PickBestExecutionContext {
  edgePercent: number;
  confidence: number;
  chaos: number;
  pressureScore: number;
  momentum: number;
  validationScore: number;
  falsePositiveRisk: number;
  executionDecision?: string | null;
  evPlus: boolean;
}

function formatMarket(m: string): string {
  return m.replace(/_/g, " ").trim();
}

/**
 * Ranking: edge × EV × urgência operacional; penaliza AVOID.
 */
export function pickBestExecution(
  edges: MarketEdgeRow[],
  ctx: PickBestExecutionContext
): BestExecutionPick | null {
  if (edges.length === 0) return null;

  const window = resolveOperationalState({
    edgePercent: ctx.edgePercent,
    confidence: ctx.confidence,
    chaos: ctx.chaos,
    pressureScore: ctx.pressureScore,
    momentum: ctx.momentum,
    steamMove: false,
    oddsDrift: null,
    validationScore: ctx.validationScore,
    falsePositiveRisk: ctx.falsePositiveRisk,
    evPlus: ctx.evPlus,
    executionDecision: ctx.executionDecision,
  });

  let best: BestExecutionPick | null = null;
  let bestScore = -1;

  for (const e of edges) {
    const { previousOdd, currentOdd } = resolveOddPair(e.marketOdd, e.oddsDrift ?? null);
    const odd = currentOdd ?? e.marketOdd ?? 1.01;
    if (odd < 1.01) continue;

    const edgeWin = resolveOperationalState({
      edgePercent: e.edgePercent,
      confidence: ctx.confidence,
      chaos: ctx.chaos,
      pressureScore: ctx.pressureScore,
      momentum: ctx.momentum,
      steamMove: e.steamMove ?? false,
      oddsDrift: e.oddsDrift ?? null,
      validationScore: ctx.validationScore,
      falsePositiveRisk: ctx.falsePositiveRisk,
      evPlus:
        e.classification === "EV_PLUS" ||
        e.classification === "STRONG_EDGE" ||
        e.expectedValue > 0.01,
      executionDecision: ctx.executionDecision,
    });

    if (edgeWin.state === "AVOID") continue;

    const score =
      e.edgePercent * 2.5 +
      Math.max(0, e.expectedValue) * 120 +
      edgeWin.urgency * 0.4 +
      (e.steamMove ? 12 : 0) +
      (edgeWin.state === "EXECUTE" ? 15 : 0);

    if (score > bestScore) {
      bestScore = score;
      best = {
        market: formatMarket(e.market),
        marketOdd: odd,
        fairOdd: e.fairOdd ?? null,
        previousOdd,
        edgePercent: e.edgePercent,
        expectedValue: e.expectedValue,
        confidence: ctx.confidence,
        steamMove: e.steamMove ?? false,
        oddsDrift: e.oddsDrift ?? null,
        urgency: edgeWin.urgency,
        operationalState: edgeWin.state,
        windowLabel:
          edgeWin.state === "EXECUTE"
            ? "Janela de execução aberta"
            : edgeWin.state === "MONITOR"
              ? "Monitorar entrada"
              : "Aguardar confirmação",
        score,
      };
    }
  }

  return best;
}
