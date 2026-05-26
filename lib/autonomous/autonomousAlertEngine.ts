import type { Match } from "@/types/domain";
import { evaluateMatchContext } from "@/components/terminal/intelligence/ContextEngine";
import {
  buildAutonomousAlertTelegramMessage,
} from "@/lib/execution/telegramMessageBuilder";
import { sendPremiumTelegramRaw } from "@/lib/execution/telegramLiveEngine";
import {
  getAutonomousAlertConfig,
  meetsMinAlertPriority,
  priorityRank,
} from "@/lib/autonomous/autonomousAlertConfig";
import {
  clearAutonomousFixtureState,
  markAutonomousAlertSent,
  shouldAllowAutonomousAlertSend,
} from "@/lib/autonomous/autonomousCooldown";
import { logAutonomousAlertEvent } from "@/lib/autonomous/autonomousAlertLogger";
import {
  evaluateAutonomousAlerts,
  evaluateClosureAlert,
} from "@/lib/autonomous/autonomousAlertRules";
import type {
  AutonomousAlertPriority,
  AutonomousAlertSnapshot,
  AutonomousOperationalAlert,
  AutonomousWatchlistEntry,
} from "@/lib/autonomous/autonomousAlert.types";
import { setAutonomousAlertSnapshot } from "@/lib/autonomous/autonomousAlertSnapshotStore";
import {
  buildWatchSnapshot,
  pruneWatchers,
  updateFixtureWatcher,
} from "@/lib/autonomous/autonomousMatchWatcher";
import {
  contextMatchToQueuedDispatch,
  matchToContextMatch,
} from "@/lib/autonomous/matchContextBridge";
import { buildPredictiveAutonomousAlerts } from "@/lib/predictive/predictiveAutonomousBridge";

const MAX_RECENT = 40;
const recentAlerts: AutonomousOperationalAlert[] = [];
const lastPriorityByFixture = new Map<string, AutonomousAlertPriority>();

let metricsSent = 0;
let metricsBlocked = 0;
let metricsHighContextSent = 0;

function isLiveMatch(match: Match): boolean {
  return match.status === "LIVE" || match.status === "HALFTIME";
}

function textFingerprint(alert: AutonomousOperationalAlert): string {
  return `${alert.kind}|${alert.situacao.slice(0, 32)}|${Math.floor(alert.minute / 5)}`;
}

async function deliverAlert(
  match: Match,
  alert: AutonomousOperationalAlert,
  sandbox: boolean
): Promise<boolean> {
  const dispatch = contextMatchToQueuedDispatch(match, alert);
  const text = buildAutonomousAlertTelegramMessage(
    `${alert.kindLabel.toUpperCase()} · ${alert.headline}`,
    dispatch
  );

  if (sandbox) {
    await logAutonomousAlertEvent({
      event: "sandbox_alert",
      fixtureId: alert.fixtureId,
      kind: alert.kind,
      priority: alert.priority,
      preview: text.slice(0, 200),
    });
    return true;
  }

  const result = await sendPremiumTelegramRaw(text, {
    kind: "contextual_reading",
    level: alert.priority === "critica" ? "critico" : alert.priority === "alta" ? "alerta" : "monitoramento",
    fixtureId: alert.fixtureId,
    matchLabel: alert.matchLabel,
  });

  return result.ok;
}

function buildWatchlists(matches: Match[]): AutonomousAlertSnapshot["watchlist"] {
  const entries = matches.filter(isLiveMatch).map((m) => {
    const ctx = evaluateMatchContext(matchToContextMatch(m));
    const snap = buildWatchSnapshot(m, ctx.score);
    return { m, ctx, snap };
  });

  const toEntry = (
    row: (typeof entries)[0],
    reason: string
  ): AutonomousWatchlistEntry => ({
    fixtureId: row.snap.fixtureId,
    matchLabel: `${row.m.homeTeam} x ${row.m.awayTeam}`,
    minute: row.snap.minute,
    score: row.ctx.score,
    reason,
  });

  const maisPerigosos = [...entries]
    .sort(
      (a, b) =>
        b.snap.pressure + (b.m.chaosIndex ?? 0) -
        (a.snap.pressure + (a.m.chaosIndex ?? 0))
    )
    .slice(0, 5)
    .map((r) => toEntry(r, `Pressão ${Math.round(r.snap.pressure)} · caos elevado`));

  const maisPromissores = [...entries]
    .filter((r) => r.ctx.level === "oportunidade_ev" || r.m.evEngine?.expectedValue.best)
    .sort((a, b) => b.ctx.score - a.ctx.score)
    .slice(0, 5)
    .map((r) => toEntry(r, "Oportunidade contextual / valor esperado"));

  const maisAcelerados = [...entries]
    .sort((a, b) => b.snap.acceleration - a.snap.acceleration)
    .slice(0, 5)
    .map((r) => toEntry(r, `Aceleração ofensiva ${Math.round(r.snap.acceleration)}`));

  return { maisPerigosos, maisPromissores, maisAcelerados };
}

function pushRecent(alert: AutonomousOperationalAlert): void {
  recentAlerts.unshift(alert);
  if (recentAlerts.length > MAX_RECENT) recentAlerts.length = MAX_RECENT;
}

function updateSnapshot(matches: Match[]): void {
  const config = getAutonomousAlertConfig();
  const precision =
    metricsSent > 0 ? Math.round((metricsHighContextSent / metricsSent) * 100) : 0;

  const snapshot: AutonomousAlertSnapshot = {
    generatedAt: new Date().toISOString(),
    recentAlerts: [...recentAlerts],
    watchlist: buildWatchlists(matches),
    metrics: {
      alertsSent: metricsSent,
      alertsBlocked: metricsBlocked,
      contextualPrecisionPct: precision,
      matchesMonitored: matches.filter(isLiveMatch).length,
      sandboxMode: config.sandbox,
      enabled: config.enabled,
    },
  };

  setAutonomousAlertSnapshot(snapshot);
}

/**
 * Ciclo de alertas autônomos — chamado após cada batch live (sem alterar engines).
 */
export async function runAutonomousAlertCycle(matches: Match[]): Promise<{
  sent: number;
  blocked: number;
}> {
  const config = getAutonomousAlertConfig();
  if (!config.enabled) {
    updateSnapshot(matches);
    return { sent: 0, blocked: 0 };
  }

  const live = matches.filter(isLiveMatch);
  const activeIds = new Set(
    live.map((m) => m.externalId ?? m.id.replace(/^sm-/, "") ?? m.id)
  );
  pruneWatchers(activeIds);

  let sent = 0;
  let blocked = 0;

  for (const match of live) {
    const ctxMatch = matchToContextMatch(match);
    const context = evaluateMatchContext(ctxMatch);
    const watch = updateFixtureWatcher(match, context.score);
    const fid = watch.fixtureId;
    const prevPriority = lastPriorityByFixture.get(fid) ?? null;

    const closure = evaluateClosureAlert(match, watch);
    if (closure) {
      const alerts = [closure];
      for (const alert of alerts) {
        const processed = await processOneAlert(match, alert, config.sandbox);
        if (processed === "sent") sent += 1;
        if (processed === "blocked") blocked += 1;
      }
      if (closure.kind === "LEITURA_ENCERRADA") {
        clearAutonomousFixtureState(fid);
        lastPriorityByFixture.delete(fid);
      }
      continue;
    }

    const alerts = [
      ...evaluateAutonomousAlerts(match, watch, prevPriority),
      ...buildPredictiveAutonomousAlerts(match),
    ];
    for (const alert of alerts) {
      const processed = await processOneAlert(match, alert, config.sandbox);
      if (processed === "sent") {
        sent += 1;
        lastPriorityByFixture.set(fid, alert.priority);
      }
      if (processed === "blocked") blocked += 1;
    }
  }

  metricsSent += sent;
  metricsBlocked += blocked;
  updateSnapshot(matches);

  await logAutonomousAlertEvent({
    event: "cycle_complete",
    sent,
    blocked,
    monitored: live.length,
  });

  return { sent, blocked };
}

async function processOneAlert(
  match: Match,
  alert: AutonomousOperationalAlert,
  sandbox: boolean
): Promise<"sent" | "blocked" | "skipped"> {
  if (!meetsMinAlertPriority(alert.priority)) {
    return "blocked";
  }

  const fp = textFingerprint(alert);
  const gate = shouldAllowAutonomousAlertSend({
    fixtureId: alert.fixtureId,
    kind: alert.kind,
    priority: alert.priority,
    textFingerprint: fp,
    escalated: alert.escalated,
  });

  if (!gate.allowed) {
    await logAutonomousAlertEvent({
      event: "blocked",
      fixtureId: alert.fixtureId,
      kind: alert.kind,
      reason: gate.reason,
    });
    return "blocked";
  }

  const ok = await deliverAlert(match, alert, sandbox);
  if (!ok) return "skipped";

  markAutonomousAlertSent({
    fixtureId: alert.fixtureId,
    kind: alert.kind,
    priority: alert.priority,
    textFingerprint: fp,
  });

  if (alert.contextScore >= 75) metricsHighContextSent += 1;
  pushRecent(alert);

  await logAutonomousAlertEvent({
    event: sandbox ? "sandbox_sent" : "sent",
    fixtureId: alert.fixtureId,
    kind: alert.kind,
    priority: alert.priority,
    minute: alert.minute,
  });

  return "sent";
}

export function isAutonomousAlertsEnabled(): boolean {
  return getAutonomousAlertConfig().enabled;
}
