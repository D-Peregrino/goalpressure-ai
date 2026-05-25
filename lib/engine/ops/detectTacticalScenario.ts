import type { GameState, OpsEngineInput } from "@/lib/engine/ops/ops.types";
import { detectGameState } from "@/lib/engine/ops/detectGameState";
import type { PressurePattern } from "@/lib/engine/ops/ops.types";
import { detectPressurePattern } from "@/lib/engine/ops/detectPressurePattern";

export function detectTacticalScenario(
  input: OpsEngineInput,
  gameState?: GameState,
  pattern?: PressurePattern
): string {
  const state = gameState ?? detectGameState(input);
  const pat = pattern ?? detectPressurePattern(input);
  const m = input.match;
  const p = input.pressure?.pressureScore ?? m.pressure.score;
  const terr = input.pressure?.territorialScore ?? 0;
  const poss = m.stats.possession ?? 50;

  if (state === "LOW_BLOCK" && p >= 45) {
    return "Bloco baixo sofrendo pressão sem converter em infiltração";
  }
  if (pat === "CORNER_PRESSURE") {
    return "Pressão pós-escanteio e bolas paradas ofensivas";
  }
  if (state === "CHAOTIC") {
    return "Jogo quebrado com transições verticais frequentes";
  }
  if (terr >= 65 && m.stats.shotsOnTarget < 3) {
    return "Domínio territorial estéril — posse sem finalização";
  }
  if (state === "ONE_WAY_TRAFFIC" && p >= 70) {
    return "Tráfego unidirecional — linha defensiva sob stress";
  }
  if (pat === "MOMENTUM_SPIKE") {
    return "Aceleração ofensiva em sequência — janela de transição vertical";
  }
  if (poss >= 62 && m.stats.dangerousAttacks < 12) {
    return "Pressão lateral sem penetração central";
  }
  if (state === "LATE_PRESSURE") {
    return "Pressão concentrada no fino — mercado pode atrasar reação";
  }
  return "Leitura tática em consolidação — aguardar próximo ciclo ofensivo";
}
