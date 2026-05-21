/**
 * GoalPressure AI — Sequence Memory Engine institucional.
 * Memória contextual temporal: padrões recorrentes, ciclos e comportamento persistente.
 */

import type {
  SequenceMemoryInput,
  SequenceMemoryResult,
  SequenceState,
} from "@/types/sequence";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundScore(value: number): number {
  return Math.round(clamp(value, 0, 100));
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = avg(values);
  const variance =
    values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function trend(values: number[]): number {
  if (values.length < 2) return 0;
  const first = avg(values.slice(0, Math.ceil(values.length / 2)));
  const second = avg(values.slice(Math.floor(values.length / 2)));
  return second - first;
}

function countPeaks(values: number[], threshold: number): number {
  let peaks = 0;
  for (let i = 1; i < values.length - 1; i++) {
    if (
      values[i] >= threshold &&
      values[i] > values[i - 1] &&
      values[i] >= values[i + 1]
    ) {
      peaks += 1;
    }
  }
  return peaks;
}

function oscillationStrength(values: number[]): number {
  if (values.length < 3) return 0;
  let swings = 0;
  for (let i = 1; i < values.length; i++) {
    if (Math.abs(values[i] - values[i - 1]) >= 8) swings += 1;
  }
  return (swings / (values.length - 1)) * 100;
}

function resolveSequenceState(
  input: SequenceMemoryInput,
  metrics: {
    recurrenceScore: number;
    sustainedChaosLevel: number;
    collapseCycleProbability: number;
    pressurePersistence: number;
    offensiveCycleStrength: number;
  }
): SequenceState {
  const minute = input.minute;
  const pressureTrend = trend(input.pressureHistory);

  if (metrics.sustainedChaosLevel >= 68 && metrics.recurrenceScore >= 50) {
    return "CHAOTIC";
  }
  if (metrics.collapseCycleProbability >= 62) return "COLLAPSING";
  if (
    pressureTrend >= 8 &&
    metrics.offensiveCycleStrength >= 55 &&
    minute >= 40
  ) {
    return "ESCALATING";
  }
  if (
    metrics.pressurePersistence < 25 &&
    metrics.recurrenceScore < 30 &&
    avg(input.pressureHistory) < 40
  ) {
    return "DEADLOCK";
  }
  if (minute < 25 && pressureTrend > 0) return "BUILDING";
  return "STABLE";
}

function buildFlags(
  input: SequenceMemoryInput,
  metrics: {
    recurringPressurePattern: number;
    offensiveCycleStrength: number;
    collapseCycleProbability: number;
    fakeMomentumProbability: number;
    emotionalRecoveryIndex: number;
    defensiveFatigueCurve: number;
    lateGameDominance: number;
    sustainedChaosLevel: number;
  }
): string[] {
  const flags: string[] = [];

  if (metrics.recurringPressurePattern >= 60) flags.push("RECURRING_PRESSURE");
  if (metrics.offensiveCycleStrength >= 58) flags.push("OFFENSIVE_CYCLES");
  if (trend(input.minuteProgression) > 0 && trend(input.pressureHistory) > 10) {
    flags.push("PHASE_ACCELERATION");
  }
  if (metrics.collapseCycleProbability >= 55) flags.push("REPEATED_COLLAPSE");
  if (metrics.fakeMomentumProbability >= 55) flags.push("FAKE_MOMENTUM");
  if (
    avg(input.pressureHistory) >= 55 &&
    avg(input.microeventHistory) < 40
  ) {
    flags.push("IMPRODUCTIVE_PRESSURE");
  }
  if (metrics.emotionalRecoveryIndex >= 55) flags.push("EMOTIONAL_RECOVERY");
  if (metrics.defensiveFatigueCurve >= 58) flags.push("DEFENSIVE_FATIGUE");
  if (metrics.lateGameDominance >= 60 && input.minute >= 65) {
    flags.push("LATE_DOMINANCE");
  }
  if (metrics.sustainedChaosLevel >= 62) flags.push("CHAOS_CYCLES");

  return flags;
}

/**
 * Analisa memória sequencial do fixture e infere padrões persistentes.
 */
export function analyzeSequenceMemory(
  input: SequenceMemoryInput
): SequenceMemoryResult {
  const pressures = input.pressureHistory;
  const microevents = input.microeventHistory;
  const temporal = input.temporalHistory;
  const players = input.playerImpactHistory;
  const n = pressures.length;

  const memoryConfidence = roundScore(
    clamp(n / 12, 0, 1) * 70 + (n >= 6 ? 20 : 0) + (n >= 10 ? 10 : 0)
  );

  const recurringPressurePattern = roundScore(
    countPeaks(pressures, 55) * 14 +
      oscillationStrength(pressures) * 0.35 +
      stdDev(pressures) * 1.2
  );

  const highPressureTicks = pressures.filter((p) => p >= 52).length;
  const pressurePersistence = roundScore(
    n > 0 ? (highPressureTicks / n) * 100 + trend(pressures) * 0.5 : 0
  );

  const offensiveCycleStrength = roundScore(
    oscillationStrength(microevents.length > 0 ? microevents : pressures) *
      0.6 +
      oscillationStrength(players) * 0.4 +
      countPeaks(pressures, 48) * 10
  );

  const collapseSignals = microevents.filter((m) => m >= 55).length;
  const collapseCycleProbability = roundScore(
    collapseSignals * 18 +
      (trend(microevents) < -5 ? 15 : 0) +
      countPeaks(temporal, 60) * 8
  );

  const tiltProxy = temporal.map((t, i) =>
    Math.max(0, (microevents[i] ?? 0) - (players[i] ?? 0) * 0.3)
  );
  const emotionalRecoveryIndex = roundScore(
    trend(tiltProxy) < -3 ? 65 + Math.abs(trend(tiltProxy)) * 2 : 35
  );

  const momentumSeries = input.pressureHistory.map((p, i) => {
    const m = input.minuteProgression[i] ?? input.minute;
    return p / Math.max(1, m);
  });
  const fakeMomentumProbability = roundScore(
    trend(input.pressureHistory) > 12 &&
      avg(microevents) < 45 &&
      avg(input.pressureHistory) > 50
      ? 55 + trend(input.pressureHistory)
      : Math.max(0, trend(input.pressureHistory) - avg(microevents) * 0.3)
  );

  const sustainedChaosLevel = roundScore(
    avg(temporal) * 0.5 + avg(microevents) * 0.35 + stdDev(temporal) * 0.8
  );

  const fatigue = input.playerFatigueHistory;
  const defensiveFatigueCurve = roundScore(
    avg(fatigue) * 0.55 +
      trend(fatigue) * 1.2 +
      (input.minute / 90) * 30 +
      pressurePersistence * 0.15
  );

  const lateSlice = pressures.slice(Math.floor(n * 0.6));
  const earlySlice = pressures.slice(0, Math.ceil(n * 0.4));
  const lateGameDominance = roundScore(
    input.minute >= 60
      ? (avg(lateSlice) - avg(earlySlice)) * 0.8 + trend(lateSlice) * 1.2
      : trend(pressures) * 0.5
  );

  const recurrenceScore = roundScore(
    recurringPressurePattern * 0.25 +
      offensiveCycleStrength * 0.2 +
      sustainedChaosLevel * 0.15 +
      pressurePersistence * 0.15 +
      collapseCycleProbability * 0.1 +
      lateGameDominance * 0.15
  );

  const sequenceState = resolveSequenceState(input, {
    recurrenceScore,
    sustainedChaosLevel,
    collapseCycleProbability,
    pressurePersistence,
    offensiveCycleStrength,
  });

  const flags = buildFlags(input, {
    recurringPressurePattern,
    offensiveCycleStrength,
    collapseCycleProbability,
    fakeMomentumProbability,
    emotionalRecoveryIndex,
    defensiveFatigueCurve,
    lateGameDominance,
    sustainedChaosLevel,
  });

  return {
    fixtureId: input.fixtureId,
    matchId: input.matchId,
    matchLabel: input.matchLabel,
    minute: input.minute,
    recurringPressurePattern,
    pressurePersistence,
    offensiveCycleStrength,
    collapseCycleProbability,
    emotionalRecoveryIndex,
    fakeMomentumProbability,
    sustainedChaosLevel,
    defensiveFatigueCurve,
    lateGameDominance,
    recurrenceScore,
    memoryConfidence,
    sequenceState,
    flags,
    computedAt: new Date().toISOString(),
  };
}

/** Boost de urgência para Signal Decision (1 = neutro). */
export function sequenceUrgencyBoost(result: SequenceMemoryResult): number {
  if (result.sequenceState === "ESCALATING") return 1.14;
  if (result.sequenceState === "CHAOTIC") return 1.1;
  if (result.recurrenceScore >= 70) return 1.08;
  if (result.fakeMomentumProbability >= 60) return 0.92;
  if (result.sequenceState === "DEADLOCK") return 0.88;
  return 1;
}

/** Ajuste para Temporal Dynamics. */
export function sequenceTemporalBoost(result: SequenceMemoryResult): number {
  return Math.min(
    16,
    result.sustainedChaosLevel * 0.08 +
      (result.sequenceState === "ESCALATING" ? 8 : 0) +
      result.lateGameDominance * 0.05
  );
}

/** Ajuste para Market Calibration. */
export function sequenceMarketEdgeBoost(result: SequenceMemoryResult): number {
  if (result.sequenceState === "DEADLOCK") return -0.002;
  return (result.recurrenceScore - 50) * 0.0006;
}

/** Ajuste para Microevent (ciclo seguinte ou pós-análise). */
export function sequenceMicroeventBoost(result: SequenceMemoryResult): number {
  if (result.offensiveCycleStrength >= 65) return 6;
  if (result.sequenceState === "CHAOTIC") return 8;
  return 0;
}
