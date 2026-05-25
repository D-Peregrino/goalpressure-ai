import type { Match } from "@/types/domain";
import type { OffensivePressureResult } from "@/lib/engine/pressure/pressure.types";
import { calculateConfidenceScore } from "@/lib/engine/ev/calculateConfidenceScore";
import { calculateExpectedGoals } from "@/lib/engine/ev/calculateExpectedGoals";
import { calculateExpectedValue } from "@/lib/engine/ev/calculateExpectedValue";
import { calculateFairOdds } from "@/lib/engine/ev/calculateFairOdds";
import {
  calculateGoalProbability,
  primaryGoalProbability,
} from "@/lib/engine/ev/calculateGoalProbability";
import { calculateMarketDistortion } from "@/lib/engine/ev/calculateMarketDistortion";
import type {
  EvEngineResult,
  EvMarketCalc,
  EvSignalType,
  MatchEvEngine,
  RankedEvSignal,
} from "@/lib/engine/ev/ev.types";
import { logEvEngineMetric } from "@/lib/engine/ev/evLogger";
import { computeRankScore, rankOpportunities } from "@/lib/engine/ev/rankOpportunities";

function fixtureId(match: Match): string {
  return match.externalId ?? match.id.replace(/^sm-/, "") ?? match.id;
}

function buildMarketCalc(
  market: EvMarketCalc["market"],
  probability: number,
  marketOdd: number,
  match: Match,
  pressure: OffensivePressureResult
): EvMarketCalc {
  const fair = calculateExpectedValue(probability, marketOdd);
  const distortion = calculateMarketDistortion(marketOdd, fair.fairOdds);
  const conf = calculateConfidenceScore(
    match,
    pressure,
    distortion.level,
    fair.evPercent
  );
  return {
    market,
    ...fair,
    distortionLevel: distortion.level,
    distortionPercent: distortion.percent,
    confidenceScore: conf.score,
    confidenceClass: conf.class,
  };
}

function buildEvSignals(
  match: Match,
  pressure: OffensivePressureResult,
  probs: ReturnType<typeof calculateGoalProbability>,
  fair: ReturnType<typeof calculateFairOdds>,
  over05: EvMarketCalc,
  over15: EvMarketCalc
): RankedEvSignal[] {
  const candidates: RankedEvSignal[] = [];
  const minute = match.minute;
  const corners = match.stats.corners;

  const push = (
    type: EvSignalType,
    calc: EvMarketCalc,
    label: string
  ) => {
    candidates.push({
      ...calc,
      signalType: type,
      label,
      rankScore: computeRankScore(
        { ...calc, signalType: type, rankScore: 0, label },
        pressure.pressureScore
      ),
    });
  };

  if (over05.evPercent >= 2 && over05.confidenceScore >= 45) {
    push("EV_OVER_0_5", over05, "EV+ Over 0.5 Live");
  }
  if (over15.evPercent >= 3 && over15.confidenceScore >= 50) {
    push("EV_OVER_1_5", over15, "EV+ Over 1.5 Live");
  }
  if (minute >= 70 && probs.lateGoal >= 55 && over05.evPercent >= 1) {
    const lateCalc = buildMarketCalc(
      "EV_LATE_GOAL",
      probs.lateGoal,
      match.odds.over05,
      match,
      pressure
    );
    push("EV_LATE_GOAL", lateCalc, "EV+ Gol Tardio");
  }
  if (corners >= 5 && pressure.accelerationScore >= 55) {
    const cornerProb = Math.min(85, 40 + corners * 5);
    const cornerCalc = buildMarketCalc(
      "EV_CORNERS",
      cornerProb,
      match.odds.primary,
      match,
      pressure
    );
    push("EV_CORNERS", cornerCalc, "EV+ Escanteios");
  }
  if (pressure.accelerationScore >= 75 && over05.evPercent >= 0) {
    const breakCalc = buildMarketCalc(
      "EV_PRESSURE_BREAK",
      probs.overLive,
      match.odds.primary,
      match,
      pressure
    );
    push("EV_PRESSURE_BREAK", breakCalc, "EV+ Pressure Break");
  }

  return rankOpportunities(candidates);
}

/**
 * Pipeline EV completo para um fixture (pressão → probabilidade → value).
 */
export function runEvEngine(
  match: Match,
  pressure: OffensivePressureResult
): EvEngineResult {
  const xg = calculateExpectedGoals(match, pressure);
  const probabilities = calculateGoalProbability(match, pressure, xg);
  const fairOdds = calculateFairOdds(probabilities);
  const marketOdds = {
    over05: Math.max(1.01, match.odds.over05),
    over15: Math.max(1.01, match.odds.over15),
    primary: Math.max(1.01, match.odds.primary),
  };

  const over05 = buildMarketCalc(
    "OVER_0_5",
    probabilities.over05,
    marketOdds.over05,
    match,
    pressure
  );
  const over15 = buildMarketCalc(
    "OVER_1_5",
    probabilities.over15,
    marketOdds.over15,
    match,
    pressure
  );

  const best =
    over05.evPercent >= over15.evPercent
      ? over05.evPercent >= 1
        ? over05
        : over15.evPercent >= 1
          ? over15
          : null
      : over15.evPercent >= 1
        ? over15
        : over05.evPercent >= 1
          ? over05
          : null;

  const primaryDistortion = best
    ? calculateMarketDistortion(best.marketOdds, best.fairOdds)
    : calculateMarketDistortion(marketOdds.over05, fairOdds.over05);

  const confidence = calculateConfidenceScore(
    match,
    pressure,
    primaryDistortion.level,
    best?.evPercent ?? 0
  );

  const rankedSignals = buildEvSignals(
    match,
    pressure,
    probabilities,
    fairOdds,
    over05,
    over15
  );

  const evEngine: MatchEvEngine = {
    probabilityGoal: primaryGoalProbability(probabilities),
    probabilities,
    expectedGoals: xg,
    fairOdds,
    marketOdds,
    expectedValue: { over05, over15, best },
    distortion: {
      level: primaryDistortion.level,
      percent: primaryDistortion.percent,
      marketVsFair: primaryDistortion.marketVsFair,
    },
    confidence,
    rankedSignals,
  };

  logEvEngineMetric({
    fixture: fixtureId(match),
    probability: evEngine.probabilityGoal,
    fairOdds: best?.fairOdds ?? fairOdds.over05,
    marketOdds: best?.marketOdds ?? marketOdds.over05,
    ev: best?.evPercent ?? 0,
    confidence: confidence.score,
    distortion: primaryDistortion.level,
  });

  return {
    fixtureId: fixtureId(match),
    evEngine,
    rankedSignals,
  };
}

export function applyEvEngineToMatch(
  match: Match,
  result: EvEngineResult
): Match {
  return { ...match, evEngine: result.evEngine };
}
