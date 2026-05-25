import type { Match } from "@/types/domain";
import type { MatchEvEngine } from "@/lib/engine/ev/ev.types";
import type { OffensivePressureResult } from "@/lib/engine/pressure/pressure.types";
import { detectGameState } from "@/lib/engine/ops/detectGameState";
import { detectPressurePattern } from "@/lib/engine/ops/detectPressurePattern";
import { detectChaosLevel } from "@/lib/engine/ops/detectChaosLevel";
import { classifyMatchTemperature } from "@/lib/engine/ops/classifyMatchTemperature";
import { calculateRiskContext } from "@/lib/engine/ops/calculateRiskContext";
import { detectTacticalScenario } from "@/lib/engine/ops/detectTacticalScenario";
import {
  generateOperationalConductor,
  generateOperationalHeadline,
  generateOperationalNarrative,
} from "@/lib/engine/ops/generateOperationalNarrative";
import { logOpsMetric } from "@/lib/engine/ops/opsLogger";
import type {
  OpsEngineInput,
  OperationalInsightResult,
} from "@/lib/engine/ops/ops.types";

export interface MatchOpsIntelligence {
  gameState: OperationalInsightResult["gameState"];
  pressurePattern: OperationalInsightResult["pressurePattern"];
  tacticalScenario: string;
  chaosLevel: number;
  chaosClass: OperationalInsightResult["chaosClass"];
  temperature: OperationalInsightResult["temperature"];
  riskContext: OperationalInsightResult["riskContext"];
  narrative: string;
  headline: string;
  conductor: string;
  focusScore: number;
  updatedAt: string;
}

function buildFocusScore(
  input: OpsEngineInput,
  temperature: OperationalInsightResult["temperature"],
  chaos: number
): number {
  const p = input.pressure?.pressureScore ?? input.match.pressure.score;
  const a = input.pressure?.accelerationScore ?? 0;
  const ev = input.ev?.expectedValue.best?.evPercent ?? 0;
  const conf = input.ev?.confidence.score ?? 0;

  let s = p * 0.4 + a * 0.2 + chaos * 0.15 + Math.max(0, ev) * 2 + conf * 0.1;
  if (temperature === "IGNITE") s += 22;
  else if (temperature === "HOT") s += 12;
  return Math.round(Math.min(100, s));
}

export function runOperationalIntelligenceForMatch(
  input: OpsEngineInput
): OperationalInsightResult {
  const gameState = detectGameState(input);
  const pressurePattern = detectPressurePattern(input);
  const { level: chaosLevel, classification: chaosClass } =
    detectChaosLevel(input);
  const temperature = classifyMatchTemperature(input);
  const riskContext = calculateRiskContext(input);
  const tacticalScenario = detectTacticalScenario(
    input,
    gameState,
    pressurePattern
  );

  const narrative = generateOperationalNarrative(input, {
    gameState,
    pattern: pressurePattern,
    tacticalScenario,
    temperature,
    risk: riskContext,
    chaosLevel,
  });

  const headline = generateOperationalHeadline(
    input,
    temperature,
    gameState
  );

  const focusScore = buildFocusScore(input, temperature, chaosLevel);

  const fixtureId = input.match.externalId ?? input.match.id.replace(/^sm-/, "") ?? input.match.id;

  const result: OperationalInsightResult = {
    fixtureId,
    gameState,
    pressurePattern,
    tacticalScenario,
    chaosLevel,
    chaosClass,
    temperature,
    riskContext,
    narrative,
    headline,
    focusScore,
    conductor: "",
  };

  result.conductor = generateOperationalConductor(result);

  logOpsMetric({
    fixture: fixtureId,
    state: gameState,
    temperature,
    chaos: chaosLevel,
    risk: riskContext,
    pattern: pressurePattern,
  });

  return result;
}

export function applyOpsIntelligenceToMatch(
  match: Match,
  insight: OperationalInsightResult
): Match {
  const ops: MatchOpsIntelligence = {
    gameState: insight.gameState,
    pressurePattern: insight.pressurePattern,
    tacticalScenario: insight.tacticalScenario,
    chaosLevel: insight.chaosLevel,
    chaosClass: insight.chaosClass,
    temperature: insight.temperature,
    riskContext: insight.riskContext,
    narrative: insight.narrative,
    headline: insight.headline,
    conductor: insight.conductor,
    focusScore: insight.focusScore,
    updatedAt: new Date().toISOString(),
  };

  return {
    ...match,
    chaosIndex: insight.chaosLevel,
    opsIntelligence: ops,
  };
}

export function buildOpsInput(
  match: Match,
  pressure?: OffensivePressureResult,
  ev?: MatchEvEngine
): OpsEngineInput {
  return {
    match,
    pressure,
    ev: ev ?? match.evEngine,
  };
}

export function runOperationalIntelligence(
  match: Match,
  pressure?: OffensivePressureResult
): { match: Match; insight: OperationalInsightResult } {
  const input = buildOpsInput(match, pressure, match.evEngine);
  const insight = runOperationalIntelligenceForMatch(input);
  return {
    match: applyOpsIntelligenceToMatch(match, insight),
    insight,
  };
}
