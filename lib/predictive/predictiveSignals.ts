import type { MatchContextResult } from "@/components/terminal/intelligence/ContextEngine";
import { getContextSignals } from "@/components/terminal/intelligence/contextRules";
import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import type { FixtureWatchState } from "@/lib/autonomous/autonomousMatchWatcher";
import {
  computeGoalPressureProbability,
  computeOffensiveAcceleration,
  type AccelerationInput,
} from "@/lib/predictive/predictiveAcceleration";
import {
  computeCollapseRisk,
  computeContextualBreakProbability,
  computeDefensiveRisk,
  computeRuptureRisk,
  resolveTrendDirection,
  trendDirectionLabel,
} from "@/lib/predictive/predictiveRisk";
import type {
  PredictiveLevel,
  PredictiveReading,
  PredictiveTimelinePoint,
} from "@/lib/predictive/predictive.types";

const LEVEL_LABELS: Record<PredictiveLevel, string> = {
  estavel: "Estável",
  aceleracao: "Aceleração",
  pre_ruptura: "Pré-ruptura",
  ruptura_iminente: "Ruptura iminente",
  exaustao_ofensiva: "Exaustão ofensiva",
};

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function computeMarketLagScore(
  match: EnrichedLiveMatch,
  acceleration: number,
  context: MatchContextResult
): number {
  const signals = getContextSignals(match);
  const edge = Math.abs(match.edgePercent ?? 0);
  let score = 0;
  if (signals.marketLate) score += 42;
  if (signals.oddDistortion) score += 28;
  if (acceleration >= 55 && edge < 4) score += 22;
  if (context.level === "oportunidade_ev") score += 18;
  if ((match.oddsDrift ?? 0) === 0 && acceleration >= 48) score += 10;
  return clamp100(score);
}

export function detectPrePressure(
  pressure: number,
  acceleration: number,
  watch: FixtureWatchState | undefined,
  marketLag: number
): boolean {
  const rising = (watch?.momentumRisingStreak ?? 0) >= 2;
  const progressive =
    (watch?.pressureSamples.length ?? 0) >= 3 &&
    slope(watch!.pressureSamples) >= 8;
  return (
    (pressure >= 58 && acceleration >= 45 && rising) ||
    progressive ||
    (marketLag >= 50 && acceleration >= 40)
  );
}

function slope(values: number[]): number {
  if (values.length < 2) return 0;
  return values[values.length - 1]! - values[0]!;
}

export function classifyPredictiveLevel(params: {
  pressure: number;
  acceleration: number;
  breakProbability: number;
  collapseRisk: number;
  marketLag: number;
  contextScore: number;
  momentumFalling: boolean;
}): PredictiveLevel {
  const { pressure, acceleration, breakProbability, collapseRisk, marketLag, contextScore, momentumFalling } =
    params;

  if (momentumFalling && pressure < 55) return "exaustao_ofensiva";
  if (breakProbability >= 78 || (pressure >= 82 && acceleration >= 65)) {
    return "ruptura_iminente";
  }
  if (
    breakProbability >= 62 ||
    marketLag >= 58 ||
    (pressure >= 68 && acceleration >= 52) ||
    contextScore >= 75
  ) {
    return "pre_ruptura";
  }
  if (acceleration >= 42 || pressure >= 55 || collapseRisk >= 50) {
    return "aceleracao";
  }
  return "estavel";
}

export function buildProjectionTimeline(
  match: EnrichedLiveMatch,
  acceleration: number,
  trend: "mandante" | "visitante" | "equilibrado"
): PredictiveTimelinePoint[] {
  const current = match.minute ?? 1;
  const base = match.pressureScore;
  const slopePerMin = acceleration / 100;
  const bias = trend === "mandante" ? 1.08 : trend === "visitante" ? 0.92 : 1;

  return [3, 6, 9].map((delta) => {
    const minute = Math.min(90, current + delta);
    const projected = clamp100(base + slopePerMin * delta * 12 * bias);
    return { minute, projectedPressure: projected };
  });
}

export function buildPredictiveNarrative(params: {
  level: PredictiveLevel;
  prePressure: boolean;
  marketLag: number;
  trendLabel: string;
  goalPressureProbability: number;
}): string {
  const { level, prePressure, marketLag, trendLabel, goalPressureProbability } = params;

  if (level === "ruptura_iminente") {
    return "Ruptura ofensiva provável nos próximos minutos — probabilidade contextual elevada, sem confirmação total do evento.";
  }
  if (level === "pre_ruptura") {
    return "Contexto favorável a aceleração ofensiva antes da confirmação completa — monitorar transição tática.";
  }
  if (level === "exaustao_ofensiva") {
    return "Ritmo ofensivo perde força — leitura preditiva indica desaceleração contextual.";
  }
  if (prePressure) {
    return "Pré-pressão detectada: sequência ascendente de pressão e ataques perigosos com mercado ainda lento.";
  }
  if (marketLag >= 55) {
    return "Mercado atrasado em relação ao contexto em campo — possível janela de leitura antecipada.";
  }
  if (goalPressureProbability >= 65) {
    return "Probabilidade contextual elevada de pressão ofensiva sustentada — acompanhar confirmação tática.";
  }
  return `${trendLabel}. Cenário estável com sinais preditivos moderados.`;
}

export function evaluatePredictiveReading(
  match: EnrichedLiveMatch,
  context: MatchContextResult,
  watch?: FixtureWatchState
): PredictiveReading {
  const providerMomentum = match.sportmonksMomentum ?? match.momentum;
  const accelInput: AccelerationInput = {
    matchId: match.matchId,
    pressureScore: match.pressureScore,
    momentum: providerMomentum,
    dangerousAttacks: match.dangerousAttacks,
    engineAcceleration: match.engineAccelerationScore,
    territorialScore: match.engineTerritorialScore,
    possession: match.possession,
    pressureSamples: watch?.pressureSamples,
    momentumSamples: watch?.momentumSamples,
    dangerousSamples: watch?.dangerousSamples,
  };

  const offensiveAcceleration = computeOffensiveAcceleration(accelInput);
  const marketLagScore = computeMarketLagScore(match, offensiveAcceleration, context);
  const contextualProbability = clamp100(
    context.score * 0.55 + offensiveAcceleration * 0.25 + marketLagScore * 0.2
  );

  const goalPressureProbability = computeGoalPressureProbability(
    match.pressureScore,
    offensiveAcceleration,
    match.dangerousAttacks,
    context.score
  );

  const collapseRisk = computeCollapseRisk({
    pressure: match.pressureScore,
    momentum: match.momentum,
    acceleration: offensiveAcceleration,
    chaosIndex: match.chaosIndex,
    homePressure: match.homePressure,
    awayPressure: match.awayPressure,
    dominantSide: match.dominantSide,
    momentumFallingStreak: watch?.momentumFallingStreak,
    peakPressure: watch?.peakPressure,
    marketLagScore,
  });

  const defensiveRisk = computeDefensiveRisk({
    pressure: match.pressureScore,
    momentum: providerMomentum,
    acceleration: offensiveAcceleration,
    chaosIndex: match.chaosIndex,
    homePressure: match.homePressure,
    awayPressure: match.awayPressure,
    dominantSide: match.dominantSide,
    marketLagScore,
  });

  const contextualBreakProbability = computeContextualBreakProbability(
    {
      pressure: match.pressureScore,
      momentum: providerMomentum,
      acceleration: offensiveAcceleration,
      chaosIndex: match.chaosIndex,
      homePressure: match.homePressure,
      awayPressure: match.awayPressure,
      dominantSide: match.dominantSide,
      marketLagScore,
    },
    contextualProbability
  );

  const ruptureRisk = computeRuptureRisk(contextualBreakProbability, collapseRisk);
  const prePressureActive = detectPrePressure(
    match.pressureScore,
    offensiveAcceleration,
    watch,
    marketLagScore
  );
  const marketLagActive = marketLagScore >= 50;

  const level = classifyPredictiveLevel({
    pressure: match.pressureScore,
    acceleration: offensiveAcceleration,
    breakProbability: contextualBreakProbability,
    collapseRisk,
    marketLag: marketLagScore,
    contextScore: context.score,
    momentumFalling: (watch?.momentumFallingStreak ?? 0) >= 3,
  });

  const trendDirection = resolveTrendDirection(match.dominantSide, providerMomentum);
  const trendLabel = trendDirectionLabel(trendDirection);

  return {
    fixtureId: match.fixtureId,
    matchId: match.matchId,
    matchLabel: `${match.homeTeam} x ${match.awayTeam}`,
    minute: match.minute ?? 0,
    level,
    levelLabel: LEVEL_LABELS[level],
    goalPressureProbability,
    offensiveAcceleration,
    collapseRisk,
    contextualBreakProbability,
    marketLagScore,
    contextualProbability,
    defensiveRisk,
    ruptureRisk,
    prePressureActive,
    marketLagActive,
    trendDirection,
    trendLabel,
    narrative: buildPredictiveNarrative({
      level,
      prePressure: prePressureActive,
      marketLag: marketLagScore,
      trendLabel,
      goalPressureProbability,
    }),
    projection: buildProjectionTimeline(match, offensiveAcceleration, trendDirection),
    generatedAt: new Date().toISOString(),
  };
}
