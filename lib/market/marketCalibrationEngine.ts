/**
 * GoalPressure AI — Market Calibration Engine institucional.
 * Compara probabilidades proprietárias vs odds reais do mercado.
 */

import type {
  CalibrateMarketEdgeInput,
  MarketEdgeCalibration,
  MarketEdgeClassification,
} from "@/types/market";
import type { MarketType } from "@/types/domain";

// ─── Classification thresholds ───────────────────────────────────────────────

const CLASSIFICATION_RULES: {
  classification: MarketEdgeClassification;
  minEdge: number;
  minEv: number;
  minMispricing: number;
}[] = [
  {
    classification: "INSTITUTIONAL_EDGE",
    minEdge: 0.08,
    minEv: 0.08,
    minMispricing: 72,
  },
  {
    classification: "STRONG_EDGE",
    minEdge: 0.05,
    minEv: 0.05,
    minMispricing: 58,
  },
  {
    classification: "EV_PLUS",
    minEdge: 0.02,
    minEv: 0.01,
    minMispricing: 42,
  },
  {
    classification: "WATCHLIST",
    minEdge: 0.005,
    minEv: 0,
    minMispricing: 25,
  },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function isSupportedMarket(market: string): market is MarketType {
  return (
    market === "OVER_0_5" ||
    market === "OVER_1_5" ||
    market === "OVER_2_5" ||
    market === "BTTS" ||
    market === "FULL_TIME_RESULT"
  );
}

/**
 * Probabilidade proprietária GoalPressure — blend pressure + goalP + signal.
 */
export function computeProprietaryProbability(
  input: CalibrateMarketEdgeInput
): number {
  const p = input.pressure;
  const market = input.market;

  let base =
    p.goalProbability * 0.45 +
    (p.pressureScore / 100) * 0.3 +
    (p.momentum / 100) * 0.1 +
    p.confidence * 0.15;

  if (market === "OVER_0_5") {
    base += 0.04;
  } else if (market === "OVER_1_5") {
    base += (p.offensiveIntensity ?? p.pressureScore) / 1000;
  } else if (market === "OVER_2_5") {
    base += (p.offensiveIntensity ?? p.pressureScore) / 800 - 0.02;
  } else if (market === "BTTS") {
    base += (p.momentum / 100) * 0.06 + (p.pressureScore / 100) * 0.04;
  } else if (market === "FULL_TIME_RESULT") {
    base += (p.pressureScore / 100) * 0.05;
  }

  if (input.signal?.signalConfidence != null) {
    base = base * 0.85 + input.signal.signalConfidence * 0.15;
  }

  if (input.signal?.ev != null && input.signal.ev > 0) {
    base += Math.min(0.04, input.signal.ev * 0.15);
  }

  return clamp(round4(base), 0.08, 0.94);
}

/**
 * Score 0–100 de mispricing vs mercado.
 */
export function computeMarketMispricingScore(
  edge: number,
  expectedValue: number,
  pressureScore: number,
  impliedProbability: number
): number {
  const edgeComponent = clamp(edge * 400, 0, 45);
  const evComponent = clamp(expectedValue * 120, 0, 35);
  const pressureComponent = clamp(pressureScore * 0.2, 0, 15);
  const divergenceComponent = clamp(
    Math.abs(edge) / Math.max(impliedProbability, 0.05) * 15,
    0,
    15
  );

  return Math.round(
    clamp(
      edgeComponent + evComponent + pressureComponent + divergenceComponent,
      0,
      100
    )
  );
}

export function classifyMarketEdge(
  edge: number,
  expectedValue: number,
  mispricingScore: number
): MarketEdgeClassification {
  if (edge <= 0 && expectedValue <= 0) return "IGNORE";

  for (const rule of CLASSIFICATION_RULES) {
    if (
      edge >= rule.minEdge &&
      expectedValue >= rule.minEv &&
      mispricingScore >= rule.minMispricing
    ) {
      return rule.classification;
    }
  }

  return edge > 0 ? "WATCHLIST" : "IGNORE";
}

/**
 * Sharp pressure — alinhamento entre pressão ofensiva e edge vs mercado.
 */
export function computeSharpPressure(
  pressureScore: number,
  momentum: number,
  edge: number
): number {
  return Math.round(
    clamp(pressureScore * 0.5 + momentum * 0.3 + edge * 200, 0, 100)
  );
}

export interface MarketDriftMetrics {
  oddsDrift: number;
  closingLineDelta: number;
  steamMove: boolean;
}

/**
 * Variação de odds e steam (queda rápida = dinheiro sharp no Over).
 */
export function computeMarketDrift(
  marketOdd: number,
  previousOdd?: number,
  openingOdd?: number
): MarketDriftMetrics {
  const safeCurrent = clamp(marketOdd, 1.01, 50);
  const prev = previousOdd && previousOdd >= 1.01 ? previousOdd : safeCurrent;
  const open = openingOdd && openingOdd >= 1.01 ? openingOdd : prev;

  const oddsDrift = round4(safeCurrent - prev);
  const closingLineDelta = round4(safeCurrent - open);
  const steamMove = oddsDrift <= -0.08 || (prev - safeCurrent) / prev >= 0.06;

  return { oddsDrift, closingLineDelta, steamMove };
}

/**
 * Calibra edge institucional vs mercado para um mercado/fixture.
 */
export function calibrateMarketEdge(
  input: CalibrateMarketEdgeInput
): MarketEdgeCalibration {
  const marketOdd = clamp(input.marketOdd, 1.01, 50);
  const impliedProbability = round4(
    input.impliedProbability ?? 1 / marketOdd
  );
  const proprietaryProbability = computeProprietaryProbability(input);
  const edge = round4(proprietaryProbability - impliedProbability);
  const edgePercent = round4(edge * 100);
  const fairOdd = round2(1 / Math.max(proprietaryProbability, 0.02));
  const expectedValue = round4(proprietaryProbability * marketOdd - 1);

  const blendedConfidence = round4(
    clamp(
      input.pressure.confidence * 0.5 +
        (input.signal?.signalConfidence ?? input.pressure.confidence) * 0.3 +
        (expectedValue > 0 ? 0.15 : 0),
      0,
      1
    )
  );

  const marketMispricingScore = computeMarketMispricingScore(
    edge,
    expectedValue,
    input.pressure.pressureScore,
    impliedProbability
  );

  const classification = classifyMarketEdge(
    edge,
    expectedValue,
    marketMispricingScore
  );

  const drift = computeMarketDrift(
    marketOdd,
    input.previousMarketOdd,
    input.openingMarketOdd
  );

  const sharpPressure = computeSharpPressure(
    input.pressure.pressureScore,
    input.pressure.momentum,
    edge
  );

  return {
    fixtureId: input.fixtureId,
    minute: input.minute,
    matchId: input.matchId,
    matchLabel: input.matchLabel,
    market: isSupportedMarket(input.market) ? input.market : String(input.market),
    proprietaryProbability,
    impliedProbability,
    edge,
    edgePercent,
    fairOdd,
    marketOdd,
    expectedValue,
    confidence: blendedConfidence,
    marketMispricingScore,
    classification,
    closingLineDelta: drift.closingLineDelta,
    oddsDrift: drift.oddsDrift,
    steamMove: drift.steamMove,
    sharpPressure,
    computedAt: new Date().toISOString(),
  };
}
