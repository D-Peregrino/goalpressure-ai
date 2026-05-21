/**
 * GoalPressure AI — Microevent Detection Engine institucional.
 * Detecta microeventos ofensivos, caos territorial e padrões sequenciais pré-gol.
 */

import type {
  MicroeventDetectionInput,
  MicroeventDetectionResult,
  MicroeventTriggerWindow,
} from "@/types/microevent";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundScore(value: number): number {
  return Math.round(clamp(value, 0, 100));
}

function resolveTriggerWindow(score: number, minute: number): MicroeventTriggerWindow {
  if (score >= 82 || (score >= 72 && minute >= 70)) return "30s";
  if (score >= 68 || (score >= 58 && minute >= 60)) return "60s";
  if (score >= 50) return "120s";
  return "300s";
}

function buildFlags(
  input: MicroeventDetectionInput,
  metrics: {
    territorialDominance: number;
    attackWaveIntensity: number;
    flankOverload: number;
    sequencePressure: number;
    transitionThreat: number;
    counterAttackRisk: number;
    collapseProbability: number;
    emotionalTilt: number;
    chaosBurst: number;
  }
): string[] {
  const flags: string[] = [];

  if (metrics.attackWaveIntensity >= 65) flags.push("ATTACK_WAVES");
  if (metrics.territorialDominance >= 60) flags.push("TERRITORIAL_PRESSURE");
  if (metrics.flankOverload >= 58) flags.push("FLANK_OVERLOAD");
  if (input.corners >= 6 && metrics.sequencePressure >= 55) {
    flags.push("CORNER_SEQUENCE");
  }
  if (
    input.shots >= 12 &&
    input.pressure.offensiveIntensity >= 60
  ) {
    flags.push("OFFENSIVE_BLITZ");
  }
  if (metrics.counterAttackRisk >= 55) flags.push("COUNTER_ATTACK_RISK");
  if (metrics.collapseProbability >= 60) flags.push("DEFENSIVE_COLLAPSE");
  if (metrics.emotionalTilt >= 58) flags.push("EMOTIONAL_TILT");
  if (metrics.transitionThreat >= 62) flags.push("RAPID_TRANSITION");
  if (
    input.redCards > 0 ||
    input.player?.flags.includes("RED_CARD_CASCADE")
  ) {
    flags.push("POST_CARD_DISORG");
  }
  if (metrics.chaosBurst >= 70) flags.push("CHAOS_BURST");

  return flags;
}

/**
 * Detecta microeventos que antecedem janelas de gol.
 */
export function detectMicroevents(
  input: MicroeventDetectionInput
): MicroeventDetectionResult {
  const p = input.pressure;
  const temporal = input.temporal;
  const player = input.player;
  const minute = input.minute;

  const pressureNorm = p.pressureScore / 100;
  const momentumNorm = p.momentum / 100;
  const chaosTemporal = (temporal?.chaosIndex ?? 40) / 100;
  const accelTemporal = (temporal?.accelerationScore ?? 35) / 100;
  const playerChaos = (player?.chaosContribution ?? 30) / 100;

  const homeAwayGap =
    Math.abs((p.homePressure ?? p.pressureScore) - (p.awayPressure ?? p.pressureScore)) /
    100;

  const territorialDominance = roundScore(
    pressureNorm * 35 +
      homeAwayGap * 40 +
      (input.possessionSwing / 100) * 25 +
      (temporal?.urgencyMultiplier ?? 1) * 8
  );

  const cornerSeqBoost = input.corners >= 5 ? Math.min(25, input.corners * 3) : 0;
  const sequencePressure = roundScore(
    (input.dangerousAttacks / Math.max(1, minute)) * 120 +
      cornerSeqBoost +
      momentumNorm * 20 +
      (player?.substitutionSwing ?? 0) * 0.15
  );

  const attackWaveIntensity = roundScore(
    (input.dangerousAttacks / Math.max(8, input.attacks)) * 55 +
      momentumNorm * 30 +
      p.offensiveIntensity * 0.25 +
      accelTemporal * 15
  );

  const chaosBurst = roundScore(
    chaosTemporal * 40 +
      playerChaos * 35 +
      (input.redCards * 12 + input.yellowCards * 4) +
      (temporal?.volatilityScore ?? 30) * 0.2
  );

  const transitionThreat = roundScore(
    input.possessionSwing * 0.35 +
      momentumNorm * 35 +
      input.xgAcceleration * 80 +
      (temporal?.accelerationScore ?? 0) * 0.25
  );

  const flankOverload = roundScore(
    (input.dangerousAttacks / Math.max(1, input.corners + 1)) * 18 +
      input.corners * 5 +
      p.offensiveIntensity * 0.3
  );

  const counterAttackRisk = roundScore(
    input.possessionSwing * 0.25 +
      transitionThreat * 0.35 +
      (100 - territorialDominance) * 0.2 +
      momentumNorm * 25
  );

  const setPieceDanger = roundScore(
    input.corners * 8 +
      (input.shotsOnTarget / Math.max(1, input.shots)) * 40 +
      sequencePressure * 0.25
  );

  const emotionalTilt = roundScore(
    input.redCards * 22 +
      input.yellowCards * 6 +
      chaosBurst * 0.35 +
      (player?.redCardImpact ?? 0) * 0.4 +
      (player?.clutchFactor ?? 0) * 0.08
  );

  const collapseProbability = roundScore(
    (player?.redCardImpact ?? input.redCards * 15) +
      chaosBurst * 0.3 +
      (temporal?.executionPriority === "CRITICAL" ? 20 : 0) +
      Math.max(0, 55 - (player?.offensiveImpact ?? 50)) * 0.15 +
      attackWaveIntensity * 0.15
  );

  const microeventScore = roundScore(
    territorialDominance * 0.12 +
      sequencePressure * 0.1 +
      attackWaveIntensity * 0.14 +
      chaosBurst * 0.1 +
      transitionThreat * 0.12 +
      flankOverload * 0.08 +
      counterAttackRisk * 0.08 +
      setPieceDanger * 0.1 +
      emotionalTilt * 0.06 +
      collapseProbability * 0.1 +
      p.goalProbability * 100 * 0.1
  );

  const flags = buildFlags(input, {
    territorialDominance,
    attackWaveIntensity,
    flankOverload,
    sequencePressure,
    transitionThreat,
    counterAttackRisk,
    collapseProbability,
    emotionalTilt,
    chaosBurst,
  });

  const triggerWindow = resolveTriggerWindow(microeventScore, minute);

  return {
    fixtureId: input.fixtureId,
    matchId: input.matchId,
    matchLabel: input.matchLabel,
    minute,
    territorialDominance,
    sequencePressure,
    attackWaveIntensity,
    chaosBurst,
    transitionThreat,
    flankOverload,
    counterAttackRisk,
    setPieceDanger,
    emotionalTilt,
    collapseProbability,
    microeventScore,
    triggerWindow,
    flags,
    computedAt: new Date().toISOString(),
  };
}

/** Boost de urgência para Signal Decision (1 = neutro). */
export function microeventUrgencyBoost(result: MicroeventDetectionResult): number {
  if (result.microeventScore >= 80) return 1.18;
  if (result.microeventScore >= 65) return 1.12;
  if (result.triggerWindow === "30s") return 1.1;
  if (result.triggerWindow === "60s") return 1.06;
  return 1;
}

/** Ajuste de edge para Market Calibration. */
export function microeventMarketEdgeBoost(
  result: MicroeventDetectionResult
): number {
  const scoreBoost = (result.microeventScore - 50) * 0.0007;
  const setPieceBoost = result.setPieceDanger * 0.0004;
  return scoreBoost + setPieceBoost;
}

/** Boost de chaos/urgência para Temporal Dynamics. */
export function microeventTemporalBoost(
  result: MicroeventDetectionResult
): number {
  return Math.min(
    18,
    result.chaosBurst * 0.1 +
      result.attackWaveIntensity * 0.06 +
      result.collapseProbability * 0.05
  );
}

/** Boost de impacto ofensivo para Player Impact (próximo ciclo usa snapshot). */
export function microeventPlayerOffensiveBoost(
  result: MicroeventDetectionResult
): number {
  if (result.attackWaveIntensity >= 70) return 1.08;
  if (result.flags.includes("OFFENSIVE_BLITZ")) return 1.05;
  return 1;
}
