import { evaluateMatchContext } from "@/components/terminal/intelligence/ContextEngine";
import { mapOperationalDecision } from "@/components/terminal/decision/decisionMapper";
import { matchToContextMatch } from "@/lib/autonomous/matchContextBridge";
import type { BacktestScenarioThresholds } from "@/lib/backtesting/backtestScenarios";
import type {
  BacktestSimulationRow,
  SimulatedAction,
} from "@/lib/backtesting/backtest.types";
import type { HistoricalSignalOutcome } from "@/lib/engine/learning/learning.types";
import { evaluatePredictiveReading } from "@/lib/predictive/predictiveSignals";
import type { Match, MatchScore } from "@/types/domain";
import type { MatchTimelineDocument, MatchTimelineEntry } from "@/lib/storage/matchTimelineStorage";

export interface EvaluatedBacktestPoint {
  row: BacktestSimulationRow;
  patternKey: string;
  contextLevel: string;
  predictiveLevel: string;
  marketLagScore: number;
}

function parseScore(raw: string): MatchScore {
  const parts = raw.split(/[-:]/).map((s) => Number(s.trim()));
  const home = Number.isFinite(parts[0]) ? parts[0]! : 0;
  const away = Number.isFinite(parts[1]) ? parts[1]! : 0;
  return { home, away };
}

function totalGoals(score: MatchScore): number {
  return score.home + score.away;
}

export function outcomeToHistoricalMatch(o: HistoricalSignalOutcome): Match {
  const score = parseScore(o.finalScore);
  const da = Math.max(10, Math.round(o.pressureScore * 0.38));
  return {
    id: `sm-${o.fixtureId}`,
    externalId: o.fixtureId,
    league: o.league || "Liga não informada",
    homeTeam: o.homeTeam || "Mandante",
    awayTeam: o.awayTeam || "Visitante",
    minute: Math.max(1, o.minute),
    status: "FINISHED",
    score,
    stats: {
      shots: Math.round(da * 0.45),
      shotsOnTarget: Math.round(da * 0.2),
      dangerousAttacks: da,
      corners: Math.max(3, Math.round(o.pressureScore / 18)),
      possession: 50,
    },
    odds: {
      primary: o.odd > 1 ? o.odd : 1.85,
      over05: 1.12,
      over15: 1.45,
    },
    pressure: {
      score: o.pressureScore,
      trend: o.pressureScore >= 68 ? "RISING" : "STABLE",
    },
  };
}

export function timelineEntryToMatch(
  doc: MatchTimelineDocument,
  entry: MatchTimelineEntry
): Match {
  const p = entry.pressure?.score ?? 0;
  const stats = entry.stats;
  return {
    id: doc.matchId,
    externalId: doc.externalId,
    league: doc.league,
    homeTeam: doc.homeTeam,
    awayTeam: doc.awayTeam,
    minute: entry.minute,
    status: doc.finishedAt ? "FINISHED" : "LIVE",
    score: entry.score,
    stats: {
      shots: stats.shots,
      shotsOnTarget: stats.shotsOnTarget,
      dangerousAttacks: stats.dangerousAttacks,
      corners: stats.corners,
      possession: stats.possession ?? 50,
    },
    odds: entry.odds,
    pressure: entry.pressure,
  };
}

export function resolveSimulatedAction(
  scenario: BacktestScenarioThresholds,
  contextScore: number,
  contextLevel: string,
  predictiveLevel: string,
  breakProbability: number,
  pressure: number,
  confidence: number,
  decisionSelo: string
): SimulatedAction {
  const passesGate =
    contextScore >= scenario.minContextScore &&
    pressure >= scenario.minPressure &&
    confidence >= scenario.minConfidence;

  if (!passesGate && breakProbability < scenario.minPredictiveBreak) {
    return "neutro";
  }

  if (
    predictiveLevel === "ruptura_iminente" ||
    (breakProbability >= scenario.minPredictiveBreak && predictiveLevel === "pre_ruptura")
  ) {
    return "ruptura_provavel";
  }

  if (contextLevel === "oportunidade_ev" || decisionSelo === "OPORTUNIDADE") {
    return "oportunidade";
  }

  if (contextLevel === "zona_critica" || decisionSelo === "ALERTA") {
    return "alerta";
  }

  if (
    contextLevel === "monitoramento" ||
    contextLevel === "pressao_crescente" ||
    decisionSelo === "ACOMPANHAR"
  ) {
    return "monitoramento";
  }

  return "neutro";
}

function classifyEvaluation(
  action: SimulatedAction,
  outcome: "HIT" | "MISS"
): "valido" | "falso_positivo" | "neutro" {
  if (action === "neutro" || action === "monitoramento") return "neutro";
  if (outcome === "HIT") return "valido";
  return "falso_positivo";
}

function estimateMinutesBeforeGoal(
  minute: number,
  finalScore: MatchScore,
  goalsAtMinute?: number
): number | null {
  if (goalsAtMinute == null) return null;
  const finalTotal = totalGoals(finalScore);
  if (finalTotal <= goalsAtMinute) return null;
  const remaining = 90 - minute;
  return Math.max(1, Math.min(remaining, Math.round(remaining * 0.55)));
}

function estimateMarketDelay(marketLagScore: number): number | null {
  if (marketLagScore < 40) return null;
  return Math.round((marketLagScore / 100) * 8 * 10) / 10;
}

export function evaluateHistoricalPoint(
  o: HistoricalSignalOutcome,
  scenario: BacktestScenarioThresholds,
  goalsAtTrigger?: number
): EvaluatedBacktestPoint {
  const match = outcomeToHistoricalMatch(o);
  const enriched = matchToContextMatch(match);
  const context = evaluateMatchContext(enriched);
  const predictive = evaluatePredictiveReading(enriched, context);
  const decision = mapOperationalDecision(enriched, context);

  const action = resolveSimulatedAction(
    scenario,
    context.score,
    context.level,
    predictive.level,
    predictive.contextualBreakProbability,
    enriched.pressureScore,
    decision.confianca,
    decision.selo
  );

  const actualOutcome = o.outcome === "HIT" ? "HIT" : "MISS";
  const evaluation = classifyEvaluation(action, actualOutcome);
  const finalScore = parseScore(o.finalScore);
  const goalsAt =
    goalsAtTrigger ??
    (typeof o.minute === "number" ? Math.max(0, totalGoals(finalScore) - 1) : undefined);

  const row: BacktestSimulationRow = {
    fixtureId: o.fixtureId,
    matchLabel: `${o.homeTeam} x ${o.awayTeam}`,
    league: o.league || "—",
    minute: o.minute,
    action,
    contextScore: context.score,
    predictiveLevel: predictive.level,
    decisionSelo: decision.selo,
    actualOutcome,
    evaluation,
    minutesBeforeGoal: estimateMinutesBeforeGoal(o.minute, finalScore, goalsAt),
    marketDelayMinutes: estimateMarketDelay(predictive.marketLagScore),
  };

  return {
    row,
    patternKey: `${context.level}|${predictive.level}`,
    contextLevel: context.level,
    predictiveLevel: predictive.level,
    marketLagScore: predictive.marketLagScore,
  };
}

export function goalsAtMinuteFromTimeline(
  doc: MatchTimelineDocument,
  minute: number
): number | undefined {
  let best: MatchTimelineEntry | null = null;
  for (const entry of doc.timeline) {
    if (entry.minute <= minute) {
      if (!best || entry.minute >= best.minute) best = entry;
    }
  }
  if (best?.score) return totalGoals(best.score);
  return undefined;
}
