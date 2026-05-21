/**
 * GoalPressure AI — Meta Consensus Engine institucional.
 * Orquestra todos os motores quantitativos em decisão probabilística central.
 */

import type {
  ExecutionDecision,
  ExecutionGrade,
  MetaConsensusInput,
  MetaConsensusResult,
} from "@/types/meta";

const ENGINE_WEIGHTS: Record<keyof MetaConsensusInput["engines"], number> = {
  pressure: 0.15,
  temporal: 0.14,
  playerImpact: 0.12,
  microevent: 0.14,
  sequenceMemory: 0.13,
  marketCalibration: 0.14,
  signalReadiness: 0.1,
  backtestConfidence: 0.08,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundScore(value: number): number {
  return Math.round(clamp(value, 0, 100));
}

function weightedConsensus(engines: MetaConsensusInput["engines"]): number {
  let sum = 0;
  let w = 0;
  for (const key of Object.keys(ENGINE_WEIGHTS) as (keyof typeof ENGINE_WEIGHTS)[]) {
    const weight = ENGINE_WEIGHTS[key];
    sum += (engines[key] ?? 0) * weight;
    w += weight;
  }
  return w > 0 ? sum / w : 0;
}

function resolveGrade(score: number, confidence: number): ExecutionGrade {
  if (score >= 88 && confidence >= 75) return "S+";
  if (score >= 80 && confidence >= 68) return "S";
  if (score >= 70 && confidence >= 58) return "A";
  if (score >= 58 && confidence >= 48) return "B";
  if (score >= 45) return "C";
  return "D";
}

function resolveExecutionDecision(
  score: number,
  grade: ExecutionGrade,
  falsePositiveRisk: number,
  triggerApproval: boolean
): ExecutionDecision {
  if (falsePositiveRisk >= 72 || grade === "D") return "IGNORE";
  if (!triggerApproval) {
    if (grade === "C" || score >= 45) return "WATCH";
    return "IGNORE";
  }
  if (grade === "S+" || (grade === "S" && score >= 85)) {
    return "AGGRESSIVE_EXECUTE";
  }
  if (grade === "S" || grade === "A") return "EXECUTE";
  if (grade === "B") return "PREPARE";
  return "WATCH";
}

function rankDominantEngines(
  engines: MetaConsensusInput["engines"]
): string[] {
  const entries = Object.entries(engines) as [string, number][];
  return entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k);
}

function buildConsensusFlags(
  input: MetaConsensusInput,
  metrics: {
    consensusScore: number;
    falsePositiveRisk: number;
    contextualAlignment: number;
    executionDecision: ExecutionDecision;
  }
): string[] {
  const flags = new Set<string>(input.flags);

  if (input.rewards.fullAlignment) flags.add("FULL_ALIGNMENT");
  if (input.rewards.marketLag) flags.add("MARKET_LAG_EDGE");
  if (input.rewards.sustainedChaos >= 60) flags.add("SUSTAINED_CHAOS");
  if (input.rewards.dominanceCycle >= 55) flags.add("DOMINANCE_CYCLE");
  if (input.rewards.persistence >= 58) flags.add("EDGE_PERSISTENCE");
  if (input.penalties.fakeMomentum >= 55) flags.add("FAKE_MOMENTUM_PENALTY");
  if (input.penalties.edgeInconsistent) flags.add("EDGE_CONFLICT");
  if (input.penalties.excessVolatility >= 60) flags.add("VOLATILITY_RISK");
  if (input.penalties.engineConflict >= 50) flags.add("ENGINE_CONFLICT");
  if (metrics.falsePositiveRisk >= 65) flags.add("FALSE_POSITIVE_RISK");
  if (metrics.executionDecision === "AGGRESSIVE_EXECUTE") {
    flags.add("AGGRESSIVE_CONSENSUS");
  }
  if (metrics.consensusScore >= 75 && metrics.contextualAlignment >= 70) {
    flags.add("INSTITUTIONAL_ALIGNED");
  }

  return [...flags];
}

/**
 * Calcula consenso institucional consolidado a partir de todos os motores.
 */
export function calculateMetaConsensus(
  input: MetaConsensusInput
): MetaConsensusResult {
  const e = input.engines;

  let consensusScore = weightedConsensus(e);

  const contextualAlignment = roundScore(
    (e.pressure + e.temporal + e.microevent + e.sequenceMemory) / 4
  );

  const marketAgreement = roundScore(e.marketCalibration);

  const edgePersistence = roundScore(
    input.rewards.persistence * 0.6 +
      e.sequenceMemory * 0.25 +
      e.marketCalibration * 0.15
  );

  const volatilityRisk = roundScore(
    input.penalties.excessVolatility * 0.7 +
      (100 - e.temporal) * 0.15 +
      input.penalties.engineConflict * 0.15
  );

  let falsePositiveRisk = roundScore(
    input.penalties.fakeMomentum * 0.35 +
      input.penalties.engineConflict * 0.25 +
      input.penalties.lowHistoricalConfidence * 0.2 +
      (input.penalties.edgeInconsistent ? 22 : 0) +
      volatilityRisk * 0.15
  );

  if (input.rewards.fullAlignment) {
    consensusScore += 8;
    falsePositiveRisk = Math.max(0, falsePositiveRisk - 12);
  }
  if (input.rewards.sustainedChaos >= 55 && e.microevent >= 55) {
    consensusScore += 5;
  }
  if (input.rewards.dominanceCycle >= 58) {
    consensusScore += 4;
  }
  if (input.rewards.marketLag) {
    consensusScore += 3;
  }

  consensusScore -= input.penalties.fakeMomentum * 0.12;
  consensusScore -= input.penalties.engineConflict * 0.1;
  consensusScore -= volatilityRisk * 0.08;
  if (input.penalties.edgeInconsistent) consensusScore -= 10;

  consensusScore = roundScore(consensusScore);

  const institutionalConfidence = roundScore(
    consensusScore * 0.45 +
      contextualAlignment * 0.2 +
      marketAgreement * 0.15 +
      e.backtestConfidence * 0.12 +
      edgePersistence * 0.08 -
      falsePositiveRisk * 0.25
  );

  const executionGrade = resolveGrade(consensusScore, institutionalConfidence);

  const triggerApproval =
    (executionGrade === "S+" ||
      executionGrade === "S" ||
      executionGrade === "A") &&
    falsePositiveRisk < 58 &&
    institutionalConfidence >= 52 &&
    !input.penalties.edgeInconsistent;

  const executionDecision = resolveExecutionDecision(
    consensusScore,
    executionGrade,
    falsePositiveRisk,
    triggerApproval
  );

  const consensusFlags = buildConsensusFlags(input, {
    consensusScore,
    falsePositiveRisk,
    contextualAlignment,
    executionDecision,
  });

  const dominantEngines = rankDominantEngines(e);

  return {
    fixtureId: input.fixtureId,
    matchId: input.matchId,
    matchLabel: input.matchLabel,
    minute: input.minute,
    consensusScore,
    institutionalConfidence,
    executionGrade,
    triggerApproval,
    marketAgreement,
    contextualAlignment,
    edgePersistence,
    volatilityRisk,
    falsePositiveRisk,
    consensusFlags,
    dominantEngines,
    executionDecision,
    computedAt: new Date().toISOString(),
  };
}

/** Telegram só dispara em EXECUTE ou AGGRESSIVE_EXECUTE. */
export function isMetaTelegramApproved(result: MetaConsensusResult): boolean {
  return (
    result.executionDecision === "EXECUTE" ||
    result.executionDecision === "AGGRESSIVE_EXECUTE"
  );
}
