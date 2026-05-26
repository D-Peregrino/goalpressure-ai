import type { Match } from "@/types/domain";
import {
  contextMatchToQueuedDispatch,
  matchToContextMatch,
} from "@/lib/autonomous/matchContextBridge";
import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import { buildAutonomousAlertTelegramMessage } from "@/lib/execution/telegramMessageBuilder";
import { sendPremiumTelegramRaw } from "@/lib/execution/telegramLiveEngine";
import { getGpiConfig } from "@/lib/gpi/gpiConfig";
import { computeGpiTrend } from "@/lib/gpi/gpiHistory";
import { logGpiEvent } from "@/lib/gpi/gpiLogger";
import { pushGpiAlert } from "@/lib/gpi/gpiSnapshotStore";
import type { GPIAlertEvent, GPIAlertKind, GPIResult } from "@/lib/gpi/gpi.types";
import type { AutonomousOperationalAlert } from "@/lib/autonomous/autonomousAlert.types";
import { evaluateMatchContext } from "@/components/terminal/intelligence/ContextEngine";
import { mapOperationalDecision } from "@/components/terminal/decision/decisionMapper";

const lastAlertAt = new Map<string, number>();

function canAlert(fixtureId: string): boolean {
  const config = getGpiConfig();
  const prev = lastAlertAt.get(fixtureId) ?? 0;
  if (Date.now() - prev < config.alertCooldownMs) return false;
  lastAlertAt.set(fixtureId, Date.now());
  return true;
}

function toAutonomousShape(
  match: Match,
  gpi: GPIResult,
  headline: string
): AutonomousOperationalAlert {
  const ctxMatch = matchToContextMatch(match);
  const context = evaluateMatchContext(ctxMatch as EnrichedLiveMatch);
  const decision = mapOperationalDecision(ctxMatch as EnrichedLiveMatch, context);

  return {
    id: `gpi-${gpi.fixtureId}-${Date.now()}`,
    kind: "OPORTUNIDADE_CONTEXTUAL",
    kindLabel: "GoalPressure Index",
    priority: gpi.score >= 90 ? "critica" : gpi.score >= 85 ? "alta" : "moderada",
    fixtureId: gpi.fixtureId,
    matchId: match.id,
    matchLabel: gpi.matchLabel,
    league: match.league,
    minute: gpi.minute,
    headline,
    narrative: gpi.narrative,
    contextScore: context.score,
    contextLevel: context.level,
    situacao: decision.situacaoAtual,
    acao: decision.acaoSugerida,
    escalated: true,
    createdAt: new Date().toISOString(),
  };
}

async function dispatchGpiTelegram(
  match: Match,
  alert: AutonomousOperationalAlert,
  sandbox: boolean
): Promise<boolean> {
  const dispatch = contextMatchToQueuedDispatch(match, alert);
  const text = buildAutonomousAlertTelegramMessage(
    `GPI · ${alert.headline}`,
    dispatch
  );

  if (sandbox) {
    await logGpiEvent({
      event: "sandbox_alert",
      fixtureId: alert.fixtureId,
      preview: text.slice(0, 180),
    });
    return true;
  }

  const result = await sendPremiumTelegramRaw(text, {
    kind: "contextual_reading",
    level: alert.priority === "critica" ? "critico" : "alerta",
    fixtureId: alert.fixtureId,
    matchLabel: alert.matchLabel,
  });
  return result.ok;
}

function recordAlert(
  kind: GPIAlertKind,
  gpi: GPIResult,
  delta: number,
  headline: string
): GPIAlertEvent {
  const ev: GPIAlertEvent = {
    kind,
    fixtureId: gpi.fixtureId,
    matchLabel: gpi.matchLabel,
    score: gpi.score,
    delta,
    narrative: gpi.narrative,
    createdAt: new Date().toISOString(),
  };
  pushGpiAlert(ev);
  return ev;
}

/** Alertas GPI — integração Telegram sem alterar AutonomousAlertEngine. */
export async function processGpiAlerts(
  match: Match,
  gpi: GPIResult
): Promise<number> {
  const config = getGpiConfig();
  if (!config.enabled) return 0;

  const { delta } = computeGpiTrend(gpi.fixtureId);
  let sent = 0;

  const trySend = async (kind: GPIAlertKind, headline: string, d: number) => {
    if (!canAlert(gpi.fixtureId)) return;
    recordAlert(kind, gpi, d, headline);
    const alert = toAutonomousShape(match, gpi, headline);
    const ok = await dispatchGpiTelegram(match, alert, config.sandbox);
    if (ok) sent += 1;
    await logGpiEvent({ event: "alert", kind, fixtureId: gpi.fixtureId, score: gpi.score });
  };

  if (gpi.score >= config.alertThreshold) {
    await trySend(
      "gpi_extremo",
      `GPI ${gpi.score} — intensidade operacional extrema`,
      delta
    );
  } else if (delta >= config.rapidRiseDelta) {
    await trySend(
      "gpi_subida_rapida",
      `GPI em subida rápida (+${delta}) — ${gpi.score}`,
      delta
    );
  } else if (delta <= -config.sharpDropDelta) {
    await trySend(
      "gpi_queda_brusca",
      `GPI em queda brusca (${delta}) — reavaliar contexto`,
      delta
    );
  }

  return sent;
}

/** Formato compatível para consumo externo (lista de alertas autônomos). */
export function buildGpiAutonomousAlerts(match: Match, gpi: GPIResult): AutonomousOperationalAlert[] {
  const config = getGpiConfig();
  const { delta } = computeGpiTrend(gpi.fixtureId);
  const alerts: AutonomousOperationalAlert[] = [];

  if (gpi.score >= config.alertThreshold) {
    alerts.push(
      toAutonomousShape(match, gpi, `GPI ${gpi.score} — leitura operacional extrema`)
    );
  }
  if (delta >= config.rapidRiseDelta) {
    alerts.push(
      toAutonomousShape(match, gpi, `GPI subindo rapidamente — ${gpi.score} (+${delta})`)
    );
  }
  return alerts;
}
