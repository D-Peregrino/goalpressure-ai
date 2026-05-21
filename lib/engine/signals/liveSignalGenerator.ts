import { calculatePressureScore } from "@/lib/engine/pressure/pressureCalculator";
import { calculateProductionPressureRaw } from "@/lib/engine/pressure/productionPressureFormula";
import {
  markSignalEmitted,
  validateSignalAntiSpam,
} from "@/lib/engine/signals/signalAntiSpam";
import { calculateExpectedValue } from "@/lib/engine/ev/expectedValue";
import { calculateLiveMomentum } from "@/lib/engine/momentum/liveMomentum";
import type { MatchEngineInsight } from "@/types/engine";
import type { Match, MarketType, PressureTier, Signal } from "@/types/domain";
import {
  deriveSignalConfidence,
  deriveStake,
  getMatchLabel,
  getMarketLabel,
} from "@/types/domain";

const OVER_05_MIN_ODD = 1.5;
const OVER_15_MIN_XG = 1.2;
const OVER_15_MIN_DA = 20;

function pickBestSignal(candidates: Signal[]): Signal | null {
  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => {
    if (b.stake !== a.stake) return b.stake - a.stake;
    return b.pressureScore - a.pressureScore;
  })[0];
}

function evaluateOver05Production(match: Match, score: number): Signal | null {
  if (match.minute < 20 || match.minute > 80) return null;
  if (score < 70) return null;
  if (match.odds.over05 < OVER_05_MIN_ODD) return null;

  const confidence = deriveSignalConfidence(score);
  if (!confidence) return null;

  const pressure = calculatePressureScore(match, { skipTickRecord: true });
  const ev = calculateExpectedValue("OVER_0_5", match.odds.over05, pressure);
  const spam = validateSignalAntiSpam({
    matchId: match.id,
    market: "OVER_0_5",
    pressure,
    ev,
    requirePositiveEv: false,
  });
  if (!spam.allowed) return null;

  markSignalEmitted(match.id, "OVER_0_5");

  return {
    matchId: match.id,
    matchLabel: getMatchLabel(match),
    market: "OVER_0_5",
    confidence,
    reason: `${getMarketLabel("OVER_0_5")} · min ${match.minute}' · P${score} · odd ${match.odds.over05.toFixed(2)} · live production engine.`,
    stake: deriveStake(confidence),
    pressureScore: score,
    odd: match.odds.over05,
  };
}

function evaluateOver15Production(match: Match, score: number): Signal | null {
  const { xG } = calculateProductionPressureRaw(match);
  if (score < 75) return null;
  if (xG < OVER_15_MIN_XG) return null;
  if (match.stats.dangerousAttacks < OVER_15_MIN_DA) return null;
  if (match.odds.over15 < 1.4) return null;

  const confidence = deriveSignalConfidence(score);
  if (!confidence) return null;

  const pressure = calculatePressureScore(match, { skipTickRecord: true });
  const ev = calculateExpectedValue("OVER_1_5", match.odds.over15, pressure, {
    xG,
  });
  const spam = validateSignalAntiSpam({
    matchId: match.id,
    market: "OVER_1_5",
    pressure,
    ev,
    requirePositiveEv: false,
  });
  if (!spam.allowed) return null;

  markSignalEmitted(match.id, "OVER_1_5");

  return {
    matchId: match.id,
    matchLabel: getMatchLabel(match),
    market: "OVER_1_5",
    confidence,
    reason: `${getMarketLabel("OVER_1_5")} · P${score} · xG ${xG.toFixed(2)} · DA ${match.stats.dangerousAttacks} · odd ${match.odds.over15.toFixed(2)}.`,
    stake: deriveStake(confidence),
    pressureScore: score,
    odd: match.odds.over15,
  };
}

export function buildMatchEngineInsight(match: Match): MatchEngineInsight {
  const pressure = calculatePressureScore(match);
  const momentum = calculateLiveMomentum(match);
  const over05Ev = calculateExpectedValue(
    "OVER_0_5",
    match.odds.over05,
    pressure,
    { momentumScore: momentum.momentumScore }
  );
  const over15Ev = calculateExpectedValue(
    "OVER_1_5",
    match.odds.over15,
    pressure,
    { xG: calculateProductionPressureRaw(match).xG, momentumScore: momentum.momentumScore }
  );

  return {
    matchId: match.id,
    matchLabel: getMatchLabel(match),
    minute: match.minute,
    pressure,
    momentum,
    expectedValue: { over05: over05Ev, over15: over15Ev },
    strongestMarket: null,
  };
}

/** Generate quantitative live signals (production rules). */
export function generateLiveSignals(matches: Match[]): {
  signals: Signal[];
  insights: MatchEngineInsight[];
  enrichedMatches: Match[];
} {
  const insights = matches.map((m) => buildMatchEngineInsight(m));
  const enrichedMatches: Match[] = matches.map((match, i) => {
    const p = insights[i].pressure;
    const tier: PressureTier =
      p.level === "STRONG_ENTRY"
        ? "high"
        : p.level === "MODERATE_ENTRY" || p.level === "MONITOR"
          ? "medium"
          : "low";
    return {
      ...match,
      pressure: {
        score: p.score,
        tier,
        trend: match.pressure.trend ?? "STABLE",
        capturedAt: Date.now(),
      },
    };
  });

  const signals: Signal[] = [];

  for (const match of enrichedMatches) {
    const prod = calculateProductionPressureRaw(match);
    const candidates: Signal[] = [];
    const over05 = evaluateOver05Production(match, prod.score);
    if (over05) candidates.push(over05);
    const over15 = evaluateOver15Production(match, prod.score);
    if (over15) candidates.push(over15);
    const best = pickBestSignal(candidates);
    if (best) signals.push(best);
  }

  return { signals, insights, enrichedMatches };
}
