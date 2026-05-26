import { evaluateMatchContext } from "@/components/terminal/intelligence/ContextEngine";
import { mapOperationalDecision } from "@/components/terminal/decision/decisionMapper";
import { getContextSignals } from "@/components/terminal/intelligence/contextRules";
import type { Match } from "@/types/domain";
import type {
  AutonomousAlertKind,
  AutonomousAlertPriority,
  AutonomousOperationalAlert,
} from "@/lib/autonomous/autonomousAlert.types";
import { matchToContextMatch } from "@/lib/autonomous/matchContextBridge";
import type { FixtureWatchState } from "@/lib/autonomous/autonomousMatchWatcher";
import {
  detectContextFade,
  detectDangerousAcceleration,
  detectDefensiveCollapse,
  detectPressureSpike,
} from "@/lib/autonomous/autonomousMatchWatcher";
import { priorityRank } from "@/lib/autonomous/autonomousAlertConfig";

const KIND_LABELS: Record<AutonomousAlertKind, string> = {
  PRESSAO_EXTREMA: "Pressão extrema",
  OPORTUNIDADE_CONTEXTUAL: "Oportunidade contextual",
  DISTORCAO_COTACAO: "Distorção de cotação",
  MUDANCA_RITMO: "Mudança de ritmo",
  SEQUENCIA_OFENSIVA: "Sequência ofensiva",
  ZONA_CRITICA: "Zona crítica",
  FIM_JOGO_CRITICO: "Fim de jogo crítico",
  CONTEXTO_DESACELERANDO: "Contexto desacelerando",
  LEITURA_ENCERRADA: "Leitura encerrada",
};

function fixtureId(match: Match): string {
  return match.externalId ?? match.id.replace(/^sm-/, "") ?? match.id;
}

function makeAlert(
  match: Match,
  kind: AutonomousAlertKind,
  priority: AutonomousAlertPriority,
  headline: string,
  narrative: string,
  contextScore: number,
  contextLevel: ReturnType<typeof evaluateMatchContext>["level"],
  situacao: string,
  acao: string,
  escalated: boolean
): AutonomousOperationalAlert {
  return {
    id: `aa-${fixtureId(match)}-${kind}-${Date.now()}`,
    kind,
    kindLabel: KIND_LABELS[kind],
    priority,
    fixtureId: fixtureId(match),
    matchId: match.id,
    matchLabel: `${match.homeTeam} x ${match.awayTeam}`,
    league: match.league,
    minute: match.minute ?? 0,
    headline,
    narrative,
    contextScore,
    contextLevel,
    situacao,
    acao,
    escalated,
    createdAt: new Date().toISOString(),
  };
}

function dedupeAlertsByKind(
  alerts: AutonomousOperationalAlert[]
): AutonomousOperationalAlert[] {
  const byKind = new Map<AutonomousAlertKind, AutonomousOperationalAlert>();
  for (const a of alerts) {
    const prev = byKind.get(a.kind);
    if (!prev || priorityRank(a.priority) > priorityRank(prev.priority)) {
      byKind.set(a.kind, a);
    }
  }
  return [...byKind.values()].sort(
    (a, b) => priorityRank(b.priority) - priorityRank(a.priority)
  );
}

export function evaluateAutonomousAlerts(
  match: Match,
  watch: FixtureWatchState,
  previousPriority: AutonomousAlertPriority | null
): AutonomousOperationalAlert[] {
  const ctxMatch = matchToContextMatch(match);
  const context = evaluateMatchContext(ctxMatch);
  const decision = mapOperationalDecision(ctxMatch, context);
  const signals = getContextSignals(ctxMatch);
  const pressure = ctxMatch.pressureScore;
  const minute = match.minute ?? 0;

  const alerts: AutonomousOperationalAlert[] = [];
  const prevRank = previousPriority ? priorityRank(previousPriority) : 0;

  const push = (
    kind: AutonomousAlertKind,
    priority: AutonomousAlertPriority,
    headline: string,
    narrative: string
  ) => {
    const escalated = priorityRank(priority) > prevRank;
    alerts.push(
      makeAlert(
        match,
        kind,
        priority,
        headline,
        narrative,
        context.score,
        context.level,
        decision.situacaoAtual,
        decision.acaoSugerida,
        escalated
      )
    );
  };

  if (pressure > 82 || signals.pressureCritical) {
    push(
      "PRESSAO_EXTREMA",
      pressure >= 88 ? "critica" : "alta",
      "Pressão ofensiva em patamar extremo",
      context.narrativa ||
        "Índice de pressão ofensiva atingiu zona extrema — revisar leitura minuto a minuto."
    );
  }

  if (context.level === "oportunidade_ev" || decision.selo === "OPORTUNIDADE") {
    push(
      "OPORTUNIDADE_CONTEXTUAL",
      "alta",
      "Oportunidade contextual identificada",
      context.narrativa || decision.justificativa
    );
  }

  if (signals.oddDistortion || signals.marketLate) {
    push(
      "DISTORCAO_COTACAO",
      signals.marketLate ? "alta" : "moderada",
      "Distorção contextual de cotação",
      context.leituraMercado || "Mercado reage lentamente ao contexto em campo."
    );
  }

  if (watch.momentumRisingStreak >= 3 || detectPressureSpike(watch)) {
    push(
      "MUDANCA_RITMO",
      watch.momentumRisingStreak >= 4 ? "alta" : "moderada",
      "Mudança de ritmo ofensivo",
      "Momento ofensivo em aceleração consistente nos últimos ciclos de monitoramento."
    );
  }

  if (detectDangerousAcceleration(watch) || ctxMatch.dangerousSequence) {
    push(
      "SEQUENCIA_OFENSIVA",
      "alta",
      "Sequência ofensiva em progressão",
      "Ataques perigosos acelerando — sequência ofensiva consistente detectada."
    );
  }

  if (context.level === "zona_critica" || signals.pressureCritical) {
    push(
      "ZONA_CRITICA",
      "critica",
      "Zona crítica operacional",
      context.narrativa || "Contexto tático em zona crítica de pressão ofensiva."
    );
  }

  if (minute >= 70 && (pressure >= 68 || context.score >= 72)) {
    push(
      "FIM_JOGO_CRITICO",
      minute >= 80 && pressure >= 75 ? "critica" : "alta",
      "Janela final com intensidade elevada",
      `Minuto ${minute}' com intensidade contextual alta — monitoramento reforçado no fechamento.`
    );
  }

  if (context.level === "desaceleracao" || watch.momentumFallingStreak >= 3) {
    push(
      "CONTEXTO_DESACELERANDO",
      "moderada",
      "Contexto desacelerando",
      context.narrativa || "Ritmo ofensivo perde força — revisar tendência antes de nova leitura."
    );
  }

  if (detectDefensiveCollapse(match, watch)) {
    push(
      "MUDANCA_RITMO",
      "moderada",
      "Colapso de pressão detectado",
      "Queda abrupta de pressão após pico ofensivo — possível transição defensiva."
    );
  }

  if (context.score >= 75 && alerts.length === 0) {
    push(
      "OPORTUNIDADE_CONTEXTUAL",
      "moderada",
      "Score contextual elevado",
      context.recomendacao || context.narrativa
    );
  }

  return dedupeAlertsByKind(alerts);
}

export function evaluateClosureAlert(
  match: Match,
  watch: FixtureWatchState
): AutonomousOperationalAlert | null {
  const ctxMatch = matchToContextMatch(match);
  const context = evaluateMatchContext(ctxMatch);
  const decision = mapOperationalDecision(ctxMatch, context);

  const finished = match.status === "FINISHED" || match.status === "CANCELLED";
  const pressureFade =
    watch.wasActive &&
    watch.peakPressure >= 65 &&
    (ctxMatch.pressureScore <= watch.peakPressure - 25 || context.level === "neutro");
  const contextDead = detectContextFade(watch, context.score) || context.level === "neutro";

  if (!finished && !pressureFade && !contextDead) return null;

  return makeAlert(
    match,
    "LEITURA_ENCERRADA",
    "baixa",
    "Leitura operacional encerrada",
    finished
      ? "Partida finalizada — leitura operacional encerrada."
      : "Pressão e contexto perderam relevância — leitura operacional encerrada.",
    context.score,
    context.level,
    decision.situacaoAtual,
    "Apenas acompanhar",
    false
  );
}
