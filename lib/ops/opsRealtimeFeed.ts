import type { GPIAlertEvent } from "@/lib/gpi/gpi.types";
import type { CollectiveContext } from "@/lib/network/network.types";
import type { NetworkTimelineEntry } from "@/lib/network/network.types";
import type { OpsDispatchRecord, OpsLogEntry } from "@/types/opsApi";
import type { Match } from "@/types/domain";
import type { OpsTimelineEvent } from "@/lib/ops/opsCenter.types";
import { getOpsCenterConfig } from "@/lib/ops/opsCenterConfig";

function severityFromScore(score: number): OpsTimelineEvent["severity"] {
  if (score >= 75) return "high";
  if (score >= 50) return "medium";
  return "low";
}

export function buildGlobalOpsTimeline(input: {
  gpiAlerts: GPIAlertEvent[];
  networkTimeline: NetworkTimelineEntry[];
  consensus: CollectiveContext[];
  telegramDispatches: OpsDispatchRecord[];
  opsLogs: OpsLogEntry[];
  matches: Match[];
}): OpsTimelineEvent[] {
  const events: OpsTimelineEvent[] = [];
  const max = getOpsCenterConfig().maxTimeline;

  for (const a of input.gpiAlerts) {
    events.push({
      id: `gpi-${a.fixtureId}-${a.createdAt}`,
      at: a.createdAt,
      kind: "gpi",
      label: `GPI · ${a.matchLabel} — ${a.kind}`,
      fixtureId: a.fixtureId,
      severity: a.score >= 80 ? "high" : "medium",
    });
  }

  for (const t of input.networkTimeline) {
    events.push({
      id: `net-${t.id}`,
      at: t.createdAt,
      kind: t.eventType === "goal" ? "goal" : "consensus",
      label: t.label,
      fixtureId: t.fixtureId,
      severity: t.eventType === "goal" ? "high" : "medium",
    });
  }

  for (const c of input.consensus.filter((x) => x.consensusScore >= 55)) {
    events.push({
      id: `cons-${c.fixtureId}-${c.updatedAt}`,
      at: c.updatedAt,
      kind: "consensus",
      label: `Consenso ${c.consensusScore} — ${c.matchLabel}`,
      fixtureId: c.fixtureId,
      severity: severityFromScore(c.consensusScore),
    });
  }

  for (const d of input.telegramDispatches.slice(0, 12)) {
    events.push({
      id: `tg-${d.signalId}-${d.timestamp}`,
      at: d.timestamp,
      kind: "telegram",
      label: `Telegram · ${d.matchId} · ${d.market} · ${d.status}`,
      fixtureId: d.matchId,
      severity: d.status === "dispatched" ? "high" : "low",
    });
  }

  for (const m of input.matches) {
    if (m.pressure.score >= 70) {
      events.push({
        id: `pr-${m.id}-${m.updatedAt ?? Date.now()}`,
        at: m.updatedAt
          ? new Date(m.updatedAt).toISOString()
          : new Date().toISOString(),
        kind: "pressure",
        label: `Pressão ${Math.round(m.pressure.score)} — ${m.homeTeam} × ${m.awayTeam}`,
        fixtureId: String(m.externalId ?? m.id),
        severity: severityFromScore(m.pressure.score),
      });
    }
  }

  for (const log of input.opsLogs.slice(0, 8)) {
    if (log.event.includes("market") || log.event.includes("edge")) {
      events.push({
        id: `mkt-${log.id}`,
        at: log.timestamp,
        kind: "market",
        label: log.message,
        severity: "medium",
      });
    }
  }

  return events
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, max);
}
