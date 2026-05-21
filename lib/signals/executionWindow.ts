/**
 * Janela operacional — classificação EXECUTE / MONITOR / WAIT / AVOID
 * usando apenas métricas já calculadas pelo runtime (sem novo engine).
 */

export type OperationalState = "EXECUTE" | "MONITOR" | "WAIT" | "AVOID";

export type SteamDirection = "UP" | "DOWN" | "FLAT";

export interface ExecutionWindowInput {
  edgePercent: number;
  confidence: number;
  chaos: number;
  pressureScore: number;
  momentum: number;
  steamMove: boolean;
  oddsDrift: number | null;
  validationScore: number;
  falsePositiveRisk: number;
  evPlus: boolean;
  executionDecision?: string | null;
}

export interface ExecutionWindowResult {
  state: OperationalState;
  urgency: number;
  steamDirection: SteamDirection;
  score: number;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function resolveSteamDirection(oddsDrift: number | null | undefined): SteamDirection {
  if (oddsDrift == null || Math.abs(oddsDrift) < 0.02) return "FLAT";
  return oddsDrift < 0 ? "DOWN" : "UP";
}

/** Odd anterior derivado do drift já rastreado (market calibration / tracker). */
export function resolveOddPair(
  marketOdd: number | null | undefined,
  oddsDrift: number | null | undefined
): { previousOdd: number | null; currentOdd: number | null } {
  const current =
    marketOdd != null && marketOdd >= 1.01 ? marketOdd : null;
  if (current == null) return { previousOdd: null, currentOdd: null };
  if (oddsDrift == null || Math.abs(oddsDrift) < 0.005) {
    return { previousOdd: current, currentOdd: current };
  }
  const previous = clamp(current - oddsDrift, 1.01, 50);
  return { previousOdd: previous, currentOdd: current };
}

/**
 * Score 0–100 de prontidão operacional (urgência do desk).
 */
export function computeOperationalUrgency(input: ExecutionWindowInput): number {
  const edge = clamp(input.edgePercent, 0, 30);
  const conf = clamp(input.confidence, 0, 100);
  const chaos = clamp(input.chaos, 0, 100);
  const pressure = clamp(input.pressureScore, 0, 100);
  const steam = input.steamMove ? 18 : 0;
  const drift = input.oddsDrift != null ? clamp(Math.abs(input.oddsDrift) * 40, 0, 15) : 0;
  const validation = clamp(input.validationScore, 0, 100) * 0.12;
  const fpPenalty = clamp(input.falsePositiveRisk, 0, 100) * 0.15;

  const chaosBand =
    chaos >= 45 && chaos <= 85 ? 12 : chaos > 85 ? -8 : 4;

  return Math.round(
    clamp(
      edge * 2.2 +
        conf * 0.35 +
        pressure * 0.2 +
        chaosBand +
        steam +
        drift +
        validation -
        fpPenalty +
        (input.evPlus ? 8 : 0),
      0,
      100
    )
  );
}

/**
 * Regras institucionais de janela de execução.
 */
export function resolveOperationalState(
  input: ExecutionWindowInput
): ExecutionWindowResult {
  const edge = input.edgePercent ?? 0;
  const conf = input.confidence ?? 0;
  const chaos = input.chaos ?? 0;
  const pressure = input.pressureScore ?? 0;
  const momentum = input.momentum ?? 0;
  const validation = input.validationScore ?? 50;
  const fp = input.falsePositiveRisk ?? 0;
  const steamDirection = resolveSteamDirection(input.oddsDrift);
  const urgency = computeOperationalUrgency(input);

  const execDecision = (input.executionDecision ?? "").toUpperCase();
  const metaExecute =
    execDecision === "EXECUTE" || execDecision === "AGGRESSIVE_EXECUTE";

  const fakeMomentum = momentum >= 72 && pressure < 48 && edge < 8;
  const chaosExtreme = chaos > 90 || (chaos < 18 && edge > 14);
  const lowValidation = validation < 42 || fp > 65;

  if (fakeMomentum || chaosExtreme || lowValidation) {
    return { state: "AVOID", urgency, steamDirection, score: urgency * 0.3 };
  }

  const strongPressure = pressure >= 72;
  const steamActive = input.steamMove || steamDirection === "DOWN";

  if (
    edge > 12 &&
    conf > 70 &&
    chaos >= 45 &&
    chaos <= 85 &&
    (steamActive || strongPressure)
  ) {
    return {
      state: "EXECUTE",
      urgency: Math.max(urgency, metaExecute ? 88 : 80),
      steamDirection,
      score: urgency,
    };
  }

  if (metaExecute && edge >= 8 && conf >= 60) {
    return { state: "EXECUTE", urgency, steamDirection, score: urgency };
  }

  const lowVol =
    Math.abs(input.oddsDrift ?? 0) < 0.03 &&
    pressure < 50 &&
    chaos < 40;

  if (lowVol) {
    return { state: "WAIT", urgency: Math.min(urgency, 45), steamDirection, score: urgency };
  }

  if (edge >= 5 && edge <= 12 && conf >= 55 && conf <= 72) {
    return { state: "MONITOR", urgency, steamDirection, score: urgency };
  }

  if (edge >= 3 || conf >= 50 || pressure >= 58) {
    return { state: "MONITOR", urgency, steamDirection, score: urgency };
  }

  if (pressure < 45 && chaos < 35) {
    return { state: "WAIT", urgency, steamDirection, score: urgency };
  }

  return { state: "MONITOR", urgency, steamDirection, score: urgency };
}

export function validationScoreFromOps(
  institutionalConfidence: number,
  dataQualityScore: number | null,
  falsePositiveRisk: number,
  staleRisk: number
): number {
  const base = institutionalConfidence * 0.55 + (dataQualityScore ?? 72) * 0.35;
  const penalty = falsePositiveRisk * 0.25 + staleRisk * 0.2;
  return Math.round(clamp(base - penalty, 0, 100));
}
