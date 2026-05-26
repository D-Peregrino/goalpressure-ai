import { getPressureScoreHistory } from "@/lib/engine/pressure/rollingWindow";

export interface AccelerationInput {
  matchId: string;
  pressureScore: number;
  momentum: number;
  dangerousAttacks: number;
  engineAcceleration?: number;
  territorialScore?: number;
  possession?: number;
  pressureSamples?: number[];
  momentumSamples?: number[];
  dangerousSamples?: number[];
}

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function slope(values: number[]): number {
  if (values.length < 2) return 0;
  const first = values[0]!;
  const last = values[values.length - 1]!;
  return last - first;
}

/** Aceleração ofensiva 0–100 a partir de histórico e engines existentes. */
export function computeOffensiveAcceleration(input: AccelerationInput): number {
  const history = getPressureScoreHistory(input.matchId);
  const samples =
    input.pressureSamples && input.pressureSamples.length >= 2
      ? input.pressureSamples
      : history.length >= 2
        ? history.slice(-6)
        : [input.pressureScore];

  const pressureSlope = slope(samples);
  const momentumSlope =
    input.momentumSamples && input.momentumSamples.length >= 2
      ? slope(input.momentumSamples)
      : 0;
  const dangerousSlope =
    input.dangerousSamples && input.dangerousSamples.length >= 2
      ? slope(input.dangerousSamples)
      : 0;

  const base =
    (input.engineAcceleration ?? 0) +
    pressureSlope * 1.4 +
    momentumSlope * 0.9 +
    dangerousSlope * 2.2 +
    (input.territorialScore ?? 0) * 0.15;

  const progressive =
    samples.length >= 3 &&
    samples.every((v, i) => i === 0 || v >= samples[i - 1]! - 2);

  let score = base;
  if (progressive) score += 12;
  if (pressureSlope >= 10) score += 8;
  if (input.momentum >= 58) score += 6;

  return clamp100(score);
}

/** Probabilidade contextual de pressão pré-gol (não é previsão de gol certo). */
export function computeGoalPressureProbability(
  pressure: number,
  acceleration: number,
  dangerousAttacks: number,
  contextScore: number
): number {
  const daNorm = Math.min(1, dangerousAttacks / 50);
  const raw =
    pressure * 0.38 +
    acceleration * 0.28 +
    contextScore * 0.22 +
    daNorm * 100 * 0.12;
  return clamp100(raw);
}
