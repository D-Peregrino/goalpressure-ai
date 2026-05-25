import type { Match } from "@/types/domain";
import type {
  OffensiveSignalCandidate,
  OffensiveSignalType,
} from "@/lib/engine/pressure/pressure.types";
import { computeRollingWindowStats } from "@/lib/engine/pressure/rollingWindow";

export interface SignalEngineInput {
  match: Match;
  pressureScore: number;
  momentumScore: number;
  accelerationScore: number;
  territorialScore: number;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function pushSignal(
  list: OffensiveSignalCandidate[],
  type: OffensiveSignalType,
  strength: number,
  reason: string
): void {
  list.push({
    type,
    strength: clamp(strength),
    label: type.replace(/_/g, " "),
    reason,
  });
}

/**
 * Transforma métricas da engine em sinais operacionais.
 */
export function calculateSignalStrength(
  input: SignalEngineInput
): OffensiveSignalCandidate[] {
  const { match, pressureScore, momentumScore, accelerationScore } = input;
  const rolling = computeRollingWindowStats(match);
  const signals: OffensiveSignalCandidate[] = [];
  const minute = match.minute;
  const totalGoals = (match.score?.home ?? 0) + (match.score?.away ?? 0);

  if (minute >= 20 && pressureScore >= 70 && momentumScore >= 65) {
    pushSignal(
      signals,
      "OVER_0_5_LIVE",
      Math.round((pressureScore + momentumScore) / 2),
      `Min ${minute}' · P${pressureScore} · momentum ${momentumScore}`
    );
  }

  if (pressureScore >= 78 && accelerationScore >= 70) {
    pushSignal(
      signals,
      "OVER_1_5_LIVE",
      Math.round((pressureScore + accelerationScore) / 2),
      `P${pressureScore} · aceleração ${accelerationScore}`
    );
  }

  if (minute >= 70 && pressureScore >= 75 && totalGoals <= 1) {
    pushSignal(
      signals,
      "LATE_GOAL",
      pressureScore,
      `Fase final · min ${minute}' · pressão ${pressureScore}`
    );
  }

  if (accelerationScore >= 80) {
    pushSignal(
      signals,
      "PRESSURE_SPIKE",
      accelerationScore,
      `Aceleração ofensiva ${accelerationScore}%`
    );
  }

  if (rolling.corners >= 3) {
    pushSignal(
      signals,
      "CORNER_ACCELERATION",
      clamp(rolling.corners * 22),
      `${rolling.corners} escanteios na janela recente`
    );
  }

  return signals.sort((a, b) => b.strength - a.strength);
}

/** Mapeia sinal interno → mercado do domínio (quando aplicável). */
export function offensiveSignalToMarket(
  type: OffensiveSignalType
): "OVER_0_5" | "OVER_1_5" | null {
  if (type === "OVER_0_5_LIVE") return "OVER_0_5";
  if (type === "OVER_1_5_LIVE") return "OVER_1_5";
  return null;
}
