import type { Match, MarketType, Signal, SignalEvaluation } from "@/types/domain";
import {
  deriveSignalConfidence,
  deriveStake,
  getMatchLabel,
} from "@/types/domain";
import { loadActiveModel } from "@/lib/models/modelLoader";
import type {
  Over05MarketRules,
  Over15MarketRules,
  QuantitativeModel,
} from "@/types/model";

const { model: activeModel } = loadActiveModel();

function emptyEvaluation(match: Match): SignalEvaluation {
  return {
    shouldSignal: false,
    signal: null,
    matchId: match.id,
    pressureScore: match.pressure.score,
  };
}

function evaluateOver05(
  match: Match,
  rules: Over05MarketRules
): Signal | null {
  const odd = match.odds.over05;
  const { minute, pressure, stats } = match;
  const pressureScore = pressure.score;

  const checks = {
    minute: minute >= rules.minMinute && minute <= rules.maxMinute,
    pressure: pressureScore >= rules.minPressure,
    odd: odd >= rules.minOdd,
    attacks: stats.dangerousAttacks >= rules.minDangerousAttacks,
  };

  if (!checks.minute || !checks.pressure || !checks.odd || !checks.attacks) {
    return null;
  }

  const confidence = deriveSignalConfidence(pressureScore);
  if (!confidence) return null;

  const market: MarketType = "OVER_0_5";

  return {
    matchId: match.id,
    matchLabel: getMatchLabel(match),
    market,
    confidence,
    reason: `Minute ${minute}' with pressure ${pressureScore} and ${stats.dangerousAttacks} dangerous attacks — offensive momentum supports at least one more goal before full time.`,
    stake: deriveStake(confidence),
    pressureScore,
    odd,
  };
}

function evaluateOver15(
  match: Match,
  rules: Over15MarketRules
): Signal | null {
  const odd = match.odds.over15;
  const { minute, pressure, stats } = match;
  const pressureScore = pressure.score;

  const checks = {
    minute: minute >= rules.minMinute && minute <= rules.maxMinute,
    pressure: pressureScore >= rules.minPressure,
    odd: odd >= rules.minOdd,
    shots: stats.shots >= rules.minShots,
    attacks: stats.dangerousAttacks >= rules.minDangerousAttacks,
  };

  if (
    !checks.minute ||
    !checks.pressure ||
    !checks.odd ||
    !checks.shots ||
    !checks.attacks
  ) {
    return null;
  }

  const confidence = deriveSignalConfidence(pressureScore);
  if (!confidence) return null;

  const market: MarketType = "OVER_1_5";

  return {
    matchId: match.id,
    matchLabel: getMatchLabel(match),
    market,
    confidence,
    reason: `Minute ${minute}' at pressure ${pressureScore} with ${stats.shots} shots and ${stats.dangerousAttacks} dangerous attacks — sustained box presence favors a multi-goal finish.`,
    stake: deriveStake(confidence),
    pressureScore,
    odd,
  };
}

/** Pick the stronger signal when both markets qualify (higher stake, then score). */
function pickBestSignal(candidates: Signal[]): Signal | null {
  if (candidates.length === 0) return null;

  return candidates.sort((a, b) => {
    if (b.stake !== a.stake) return b.stake - a.stake;
    return b.pressureScore - a.pressureScore;
  })[0];
}

/**
 * Evaluates a live match against Over 0.5 and Over 1.5 rules.
 * Returns the best qualifying signal, or a negative evaluation.
 */
/**
 * Evaluates a match using thresholds from a specific quantitative model.
 */
export function evaluateGameWithModel(
  match: Match,
  model: QuantitativeModel
): SignalEvaluation {
  const candidates: Signal[] = [];
  const { markets } = model;

  const over05 = evaluateOver05(match, markets.OVER_0_5);
  if (over05) candidates.push(over05);

  const over15 = evaluateOver15(match, markets.OVER_1_5);
  if (over15) candidates.push(over15);

  const best = pickBestSignal(candidates);
  if (best) {
    return {
      shouldSignal: true,
      signal: best,
      matchId: match.id,
      pressureScore: match.pressure.score,
    };
  }

  return emptyEvaluation(match);
}

/** Evaluate a match with the active production model. */
export function evaluateGame(match: Match): SignalEvaluation {
  return evaluateGameWithModel(match, activeModel);
}

/** Evaluate all matches with a specific model (experimental / comparison). */
export function evaluateAllGamesWithModel(
  matches: Match[],
  model: QuantitativeModel
): Signal[] {
  return matches
    .map((match) => evaluateGameWithModel(match, model))
    .filter((result) => result.shouldSignal && result.signal !== null)
    .map((result) => result.signal as Signal);
}

/** Evaluate all live matches with the active production model. */
export function evaluateAllGames(matches: Match[]): Signal[] {
  return evaluateAllGamesWithModel(matches, activeModel);
}

/** Active model id used by the engine at runtime. */
export function getActiveModelId(): string {
  return activeModel.modelId;
}
