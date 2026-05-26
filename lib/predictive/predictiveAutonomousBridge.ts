import type { Match } from "@/types/domain";
import type {
  AutonomousAlertPriority,
  AutonomousOperationalAlert,
} from "@/lib/autonomous/autonomousAlert.types";
import { evaluateMatchContext } from "@/components/terminal/intelligence/ContextEngine";
import { mapOperationalDecision } from "@/components/terminal/decision/decisionMapper";
import { matchToContextMatch } from "@/lib/autonomous/matchContextBridge";
import type { PredictiveReading } from "@/lib/predictive/predictive.types";
import { getPredictiveSnapshot } from "@/lib/predictive/predictiveSnapshotStore";

function fixtureId(match: Match): string {
  return match.externalId ?? match.id.replace(/^sm-/, "") ?? match.id;
}

function priorityFromLevel(level: PredictiveReading["level"]): AutonomousAlertPriority {
  switch (level) {
    case "ruptura_iminente":
      return "critica";
    case "pre_ruptura":
      return "alta";
    case "aceleracao":
      return "moderada";
    default:
      return "baixa";
  }
}

function makePredictiveAlert(
  match: Match,
  reading: PredictiveReading,
  headline: string,
  priority: AutonomousAlertPriority
): AutonomousOperationalAlert {
  const ctxMatch = matchToContextMatch(match);
  const context = evaluateMatchContext(ctxMatch);
  const decision = mapOperationalDecision(ctxMatch, context);

  return {
    id: `pred-${reading.fixtureId}-${Date.now()}`,
    kind: "OPORTUNIDADE_CONTEXTUAL",
    kindLabel: "Leitura preditiva",
    priority,
    fixtureId: reading.fixtureId,
    matchId: match.id,
    matchLabel: reading.matchLabel,
    league: match.league,
    minute: reading.minute,
    headline,
    narrative: reading.narrative,
    contextScore: context.score,
    contextLevel: context.level,
    situacao: decision.situacaoAtual,
    acao: decision.acaoSugerida,
    escalated: true,
    createdAt: new Date().toISOString(),
  };
}

/** Alertas autônomos antecipados a partir da leitura preditiva. */
export function buildPredictiveAutonomousAlerts(
  match: Match
): AutonomousOperationalAlert[] {
  const fid = fixtureId(match);
  const reading = getPredictiveSnapshot()?.readings.find((r) => r.fixtureId === fid);
  if (!reading) return [];

  const alerts: AutonomousOperationalAlert[] = [];
  const basePriority = priorityFromLevel(reading.level);

  if (reading.level === "ruptura_iminente" || reading.level === "pre_ruptura") {
    alerts.push(
      makePredictiveAlert(
        match,
        reading,
        "Ruptura ofensiva provável — leitura preditiva",
        basePriority === "baixa" ? "alta" : basePriority
      )
    );
  }

  if (reading.prePressureActive) {
    alerts.push(
      makePredictiveAlert(
        match,
        reading,
        "Pré-pressão detectada antes da confirmação",
        reading.marketLagActive ? "alta" : "moderada"
      )
    );
  }

  if (reading.marketLagActive && reading.marketLagScore >= 55) {
    alerts.push(
      makePredictiveAlert(
        match,
        reading,
        "Mercado atrasado — contexto acelera antes das cotações",
        "alta"
      )
    );
  }

  return alerts;
}
