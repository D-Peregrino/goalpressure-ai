/**
 * Narrativa ao vivo do Match Center — apenas camada UX (sem engines).
 */

import type { OperationalState, SteamDirection } from "@/lib/signals/executionWindow";
import {
  insightDoJogo,
  rotuloIntensidade,
  rotuloPressaoJogo,
} from "@/lib/ux/sportsLanguage";

export type StoryTone = "hot" | "opportunity" | "market" | "calm" | "neutral";

export interface MatchStoryLine {
  id: string;
  text: string;
  tone: StoryTone;
  priority: number;
}

export interface MatchStoryInput {
  homeTeam: string;
  awayTeam: string;
  homePressure: number;
  awayPressure: number;
  pressureScore: number;
  momentum: number;
  chaosIndex: number;
  steamMove: boolean;
  steamDirection: SteamDirection;
  oddsDrift: number | null;
  operationalState: OperationalState;
  edgePercent: number | null;
  temporalPhase?: string | null;
  sequenceState?: string | null;
  microeventScore?: number;
  minute: number;
}

/** Frase principal no header — urgência e emoção. */
export function headlineDoJogo(input: MatchStoryInput): string {
  if (input.operationalState === "EXECUTE") {
    return "Alta chance de movimentação";
  }
  if (input.steamMove || input.steamDirection === "DOWN") {
    return "Mercado acelerando";
  }
  if (input.pressureScore >= 78) {
    return "Pressão ofensiva muito forte";
  }
  if (input.chaosIndex >= 68) {
    return "Jogo muito aberto agora";
  }
  if ((input.edgePercent ?? 0) >= 10) {
    return "Oportunidade nas odds";
  }
  return rotuloIntensidade(input.pressureScore);
}

export function buildMatchStories(input: MatchStoryInput): MatchStoryLine[] {
  const lines: MatchStoryLine[] = [];
  const diff = input.homePressure - input.awayPressure;

  if (input.operationalState === "EXECUTE") {
    lines.push({
      id: "exec",
      text: "Alta chance de movimentação — jogo e mercado pedem atenção agora.",
      tone: "opportunity",
      priority: 100,
    });
  }

  if (input.steamMove || input.steamDirection === "DOWN") {
    lines.push({
      id: "steam",
      text: "Mercado começando a reagir ao que está acontecendo em campo.",
      tone: "market",
      priority: 95,
    });
  } else if (input.oddsDrift != null && input.oddsDrift >= 0.04) {
    lines.push({
      id: "drift-up",
      text: "Mercado esfriou um pouco — as odds subiram após o pico de pressão.",
      tone: "calm",
      priority: 70,
    });
  }

  if (diff >= 12) {
    lines.push({
      id: "home-dom",
      text: `O ${input.homeTeam} domina os últimos minutos no campo.`,
      tone: "hot",
      priority: 88,
    });
  } else if (diff <= -12) {
    lines.push({
      id: "away-dom",
      text: `O ${input.awayTeam} está impondo o ritmo neste momento.`,
      tone: "hot",
      priority: 88,
    });
  }

  if (input.pressureScore >= 72 && input.momentum >= 60) {
    lines.push({
      id: "intensity",
      text: "Partida ganhou intensidade — sequência ofensiva forte.",
      tone: "hot",
      priority: 82,
    });
  } else if (input.pressureScore >= 62) {
    lines.push({
      id: "pressure",
      text: rotuloIntensidade(input.pressureScore),
      tone: "hot",
      priority: 75,
    });
  }

  if (input.chaosIndex >= 65) {
    lines.push({
      id: "chaos",
      text: rotuloPressaoJogo(input.chaosIndex),
      tone: "hot",
      priority: 78,
    });
  }

  if (input.sequenceState === "ESCALATING") {
    lines.push({
      id: "seq",
      text: "O ritmo do jogo está acelerando — atenção aos próximos minutos.",
      tone: "hot",
      priority: 72,
    });
  }

  if (input.temporalPhase?.includes("CRITICAL")) {
    lines.push({
      id: "phase",
      text: `Fase decisiva do jogo (${input.temporalPhase.replace(/_/g, " ").toLowerCase()}).`,
      tone: "opportunity",
      priority: 80,
    });
  }

  if ((input.microeventScore ?? 0) >= 58) {
    lines.push({
      id: "micro",
      text: "Momento quente: onda de chances e ataques seguidos.",
      tone: "hot",
      priority: 76,
    });
  }

  if ((input.edgePercent ?? 0) >= 8 && input.operationalState !== "AVOID") {
    lines.push({
      id: "edge",
      text: "As odds parecem deixar margem — vantagem detectada pelo modelo.",
      tone: "opportunity",
      priority: 74,
    });
  }

  if (input.pressureScore < 40 && input.chaosIndex < 35) {
    lines.push({
      id: "calm",
      text: "Jogo mais controlado neste instante — aguarde o próximo impulso.",
      tone: "calm",
      priority: 40,
    });
  }

  if (input.operationalState === "AVOID") {
    lines.push({
      id: "avoid",
      text: "Cenário confuso — melhor observar antes de agir.",
      tone: "calm",
      priority: 90,
    });
  }

  if (lines.length === 0) {
    lines.push({
      id: "default",
      text: insightDoJogo({
        operationalState: input.operationalState,
        pressureScore: input.pressureScore,
        edgePercent: input.edgePercent,
        steamMove: input.steamMove,
        steamDirection: input.steamDirection,
        chaosIndex: input.chaosIndex,
      }),
      tone: "neutral",
      priority: 50,
    });
  }

  return lines.sort((a, b) => b.priority - a.priority);
}

export function primaryStory(input: MatchStoryInput): MatchStoryLine {
  return buildMatchStories(input)[0]!;
}

export interface ExecutionNarrative {
  title: string;
  explanation: string;
  windowHint: string;
  confidenceLabel: string;
  marketLabel: string;
}

export function narrateExecution(input: {
  edgePercent: number;
  steamMove: boolean;
  oddsDrift: number | null;
  operationalState: OperationalState;
  confidence: number;
  urgency: number;
}): ExecutionNarrative {
  const conf = input.confidence;
  const confLabel =
    conf >= 75
      ? "Confiança alta"
      : conf >= 55
        ? "Confiança moderada"
        : "Confiança em construção";

  let title = "Acompanhe o jogo";
  let explanation = "Ainda sem leitura forte de oportunidade.";
  let windowHint = "Aguarde o mercado e o jogo alinharem.";
  let marketLabel = "Mercado estável";

  if (input.operationalState === "EXECUTE" && input.edgePercent >= 8) {
    title = "Boa oportunidade agora";
    explanation =
      "Intensidade, confiança e vantagem nas odds estão alinhadas neste mercado.";
    windowHint =
      input.urgency >= 70
        ? "Janela ideal — próximos minutos são decisivos."
        : "Janela aberta — vale monitorar de perto.";
  } else if (input.edgePercent >= 6 && !input.steamMove) {
    title = "Vantagem encontrada";
    explanation = "O modelo vê valor, mas o mercado ainda não reagiu com força.";
    windowHint = "Mercado ainda lento — entrada com mais calma.";
    marketLabel = "Mercado ainda lento";
  } else if (input.steamMove && input.edgePercent >= 4) {
    title = "Mercado acelerando";
    explanation = "As odds estão caindo enquanto o jogo esquenta — reação em curso.";
    windowHint = "Momento dinâmico — confirme antes de entrar.";
    marketLabel = "Mercado acelerando";
  } else if (input.edgePercent >= 4) {
    title = "Vantagem encontrada";
    explanation = `Vantagem de +${input.edgePercent.toFixed(1)}% frente à odd da casa.`;
    windowHint = "Observe se a pressão em campo confirma a leitura.";
  }

  if (input.steamMove) marketLabel = "Mercado acelerando";
  else if (input.oddsDrift != null && input.oddsDrift >= 0.03) {
    marketLabel = "Mercado esfriando";
  }

  return { title, explanation, windowHint, confidenceLabel: confLabel, marketLabel };
}

/** Rótulos humanos para eventos premium na timeline. */
export function humanizeTimelineEvent(type: string, side?: "home" | "away"): string {
  const t = type.toLowerCase();
  const lado = side === "home" ? "casa" : side === "away" ? "visitante" : "";
  if (t.includes("goal")) return lado ? `Gol do ${lado}` : "Gol";
  if (t.includes("corner")) return "Escanteio";
  if (t.includes("yellow")) return "Cartão amarelo";
  if (t.includes("red")) return "Cartão vermelho";
  if (t.includes("shot") || t.includes("chance")) return "Chance perigosa";
  if (t.includes("subst")) return "Substituição";
  return type.replace(/_/g, " ");
}
