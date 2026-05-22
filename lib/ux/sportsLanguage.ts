/**
 * Linguagem esportiva GoalPressure — camada de UX (lógica interna inalterada).
 */

import type { OperationalState, SteamDirection } from "@/lib/signals/executionWindow";
import type { LiveSignalEntry } from "@/lib/signals/liveSignalBuilder";

/** Rótulos humanos para estados operacionais. */
export const ESTADO_JOGO: Record<OperationalState, string> = {
  EXECUTE: "Oportunidade",
  MONITOR: "Acompanhar",
  WAIT: "Aguardar",
  AVOID: "Evitar",
};

export const ESTADO_JOGO_DICA: Record<OperationalState, string> = {
  EXECUTE: "Momento favorável para entrar com atenção — jogo e mercado alinhados.",
  MONITOR: "Jogo interessante; vale acompanhar os próximos minutos.",
  WAIT: "Ainda sem movimento claro. Espere o jogo esquentar.",
  AVOID: "Cenário confuso ou arriscado. Melhor não forçar entrada.",
};

export const TOOLTIPS = {
  vantagem:
    "Mostra se o jogo parece melhor do que as odds sugerem. Quanto maior, mais ‘valor’ no momento.",
  intensidade:
    "Força ofensiva ao vivo: ataques, pressão e ritmo do jogo. Não é só posse de bola.",
  pressaoJogo:
    "Quão intenso e imprevisível está o jogo agora — gols, chances e viradas.",
  mercadoAcelerando:
    "As odds estão caindo rápido: o mercado reagiu forte a algo no jogo.",
  mercadoEsfriando:
    "As odds subiram: o mercado ‘esfriou’ depois de um pico de pressão.",
  oportunidade: "Combinação de intensidade, confiança e vantagem nas odds.",
  oddJusta: "Preço ‘justo’ estimado pelo modelo, comparado com a odd da casa.",
  aoVivo: "Dados atualizados em tempo real do jogo.",
} as const;

export const SINAL_TIPO: Record<LiveSignalEntry["type"], string> = {
  STEAM_MOVE: "Mercado acelerando",
  EDGE_ALERT: "Boa vantagem",
  EV_PLUS: "Chance destacada",
  PRESSURE_SPIKE: "Pressão subindo",
  CHAOS_BURST: "Jogo acelerando",
  EXECUTE_WINDOW: "Janela de oportunidade",
};

export function rotuloEstado(state: OperationalState): string {
  return ESTADO_JOGO[state];
}

export function rotuloSteam(direction: SteamDirection, steamMove: boolean): string | null {
  if (!steamMove && direction === "FLAT") return null;
  if (direction === "DOWN" || steamMove) return "Mercado acelerando";
  return "Mercado esfriando";
}

export function rotuloVantagem(edgePercent: number | null): string {
  if (edgePercent == null) return "—";
  const v = edgePercent;
  if (v >= 12) return `Vantagem forte (+${v.toFixed(1)}%)`;
  if (v >= 5) return `Vantagem moderada (+${v.toFixed(1)}%)`;
  if (v > 0) return `Leve vantagem (+${v.toFixed(1)}%)`;
  return "Sem vantagem clara";
}

export function rotuloIntensidade(pressureScore: number): string {
  if (pressureScore >= 78) return "Pressão ofensiva muito forte";
  if (pressureScore >= 62) return "Jogo quente — pressão alta";
  if (pressureScore >= 45) return "Ritmo moderado";
  return "Jogo ainda tranquilo";
}

export function rotuloPressaoJogo(chaosIndex: number): string {
  if (chaosIndex >= 70) return "Jogo muito aberto — alta chance de movimento";
  if (chaosIndex >= 50) return "Jogo acelerando";
  if (chaosIndex >= 30) return "Ritmo estável";
  return "Jogo controlado";
}

/** Frase principal no card — linguagem de transmissão. */
export function insightDoJogo(input: {
  operationalState: OperationalState;
  pressureScore: number;
  edgePercent: number | null;
  steamMove: boolean;
  steamDirection: SteamDirection;
  chaosIndex: number;
}): string {
  if (input.operationalState === "EXECUTE") {
    return "Alta chance de movimentação — vale olhar com atenção.";
  }
  if (input.steamMove || input.steamDirection === "DOWN") {
    return "Mercado começando a reagir ao que está acontecendo em campo.";
  }
  if (input.pressureScore >= 72) {
    return rotuloIntensidade(input.pressureScore);
  }
  if ((input.edgePercent ?? 0) >= 8) {
    return "Odds parecem deixar uma boa margem neste mercado.";
  }
  if (input.operationalState === "AVOID") {
    return "Momento confuso — melhor esperar mais clareza.";
  }
  if (input.chaosIndex >= 65) {
    return rotuloPressaoJogo(input.chaosIndex);
  }
  return rotuloIntensidade(input.pressureScore);
}

export const TERMINAL_COPY = {
  title: "Central ao vivo",
  subtitle: "Leitura em tempo real que prioriza, alerta e conduz a decisão — não só números.",
  feedTitle: "Movimentos ao vivo",
  feedSub: "O que está acontecendo agora nos jogos",
  alertTitle: "Alertas ao vivo",
  alertSub: "Mudanças reais de contexto, em linguagem de jogo",
  alertEmpty:
    "Sem alertas fortes agora. Quando o mercado ou a intensidade mudarem, você vê a narrativa aqui.",
  heatTitle: "Jogos mais quentes",
  heatSub: "Pressão, mercado atrasado e oportunidade",
  timelineTitle: "Linha do tempo",
  timelineSub: "Pressão, odds, ritmo e leitura tática",
  radarTitle: "Radar do momento",
  edgeTitle: "Vantagens em destaque",
  kpi: {
    tracked: "Rastreadas",
    live: "Ao vivo",
    upcoming: "Próximas",
    signals: "Alertas",
    execute: "Oportunidades",
  },
} as const;

export const DICAS_RAPIDAS = [
  {
    id: "placar",
    titulo: "Placar e minuto",
    texto: "Comece pelo resultado e o tempo de jogo — o resto é leitura extra.",
  },
  {
    id: "oportunidade",
    titulo: "Oportunidade",
    texto: "Verde = momento interessante. Não é garantia, é o jogo ‘pedindo atenção’.",
  },
  {
    id: "vantagem",
    titulo: "Vantagem",
    texto: "Compara nosso modelo com a odd da casa. Número maior = mais valor percebido.",
  },
  {
    id: "mercado",
    titulo: "Mercado acelerando",
    texto: "Quando a odd cai rápido, alguém grande pode estar reagindo ao jogo.",
  },
] as const;
