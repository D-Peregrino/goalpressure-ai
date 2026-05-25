import type { GameState, OpsEngineInput } from "@/lib/engine/ops/ops.types";

function pressure(input: OpsEngineInput): number {
  return input.pressure?.pressureScore ?? input.match.pressure.score;
}

function accel(input: OpsEngineInput): number {
  return input.pressure?.accelerationScore ?? input.match.feedMeta?.offensiveEngine?.accelerationScore ?? 0;
}

function momentum(input: OpsEngineInput): number {
  return input.pressure?.momentumScore ?? input.match.feedMeta?.offensiveEngine?.momentumScore ?? 0;
}

function territorial(input: OpsEngineInput): number {
  return input.pressure?.territorialScore ?? input.match.feedMeta?.offensiveEngine?.territorialScore ?? 0;
}

/**
 * Classifica contexto tático-operacional do jogo ao vivo.
 */
export function detectGameState(input: OpsEngineInput): GameState {
  const m = input.match;
  const p = pressure(input);
  const a = accel(input);
  const mom = momentum(input);
  const terr = territorial(input);
  const minute = m.minute;
  const totalGoals = (m.score?.home ?? 0) + (m.score?.away ?? 0);
  const corners = m.stats.corners;
  const da = m.stats.dangerousAttacks;
  const shots = m.stats.shots;

  if (minute >= 70 && p >= 62 && totalGoals <= 1) return "LATE_PRESSURE";
  if (corners >= 7 && da >= 18) return "CORNER_SIEGE";
  if (p >= 72 && terr >= 60 && da >= 20) return "ONE_WAY_TRAFFIC";
  if (p < 28 && shots < 4 && da < 8) return "DEAD_GAME";
  if (p >= 55 && mom >= 70 && a >= 65) return "CHAOTIC";
  if (p >= 50 && a >= 55 && mom >= 50) return "OPEN_GAME";
  if (p >= 45 && terr >= 55 && p < 70) return "TRANSITION_HEAVY";
  if (p < 40 && totalGoals === 0 && minute > 25) return "LOW_BLOCK";
  if (p >= 38 && p < 65) return "CONTROLLED";
  return minute < 15 ? "CONTROLLED" : "OPEN_GAME";
}

export function gameStateLabel(state: GameState): string {
  const labels: Record<GameState, string> = {
    CONTROLLED: "Jogo controlado",
    OPEN_GAME: "Jogo aberto",
    CHAOTIC: "Jogo caótico",
    LOW_BLOCK: "Bloco baixo ativo",
    TRANSITION_HEAVY: "Transições frequentes",
    LATE_PRESSURE: "Pressão no fino do jogo",
    DEAD_GAME: "Ritmo baixo",
    CORNER_SIEGE: "Cerco de escanteios",
    ONE_WAY_TRAFFIC: "Tráfego unidirecional",
  };
  return labels[state];
}
