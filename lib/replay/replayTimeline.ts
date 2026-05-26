export interface ReplayTimelineEvent {
  id: string;
  fixtureId: string;
  minute: number;
  kind: "gpi" | "pressure" | "telegram" | "consensus" | "market" | "context";
  label: string;
  at: string;
}

function minuteFromIso(startAt: string, at: string): number {
  const diffMs = new Date(at).getTime() - new Date(startAt).getTime();
  return Math.max(0, Math.round(diffMs / 60_000));
}

export function buildReplayTimeline(input: {
  fixtureId: string;
  kickOffAt: string;
  snapshots: { minute: number; pressureScore: number; recordedAt: string }[];
  contexts: { minute: number; contextScore: number; contextLevel: string; recordedAt: string }[];
  predictive: { minute: number; marketLagScore: number; recordedAt: string }[];
  alerts: { minute: number; headline: string | null; recordedAt: string }[];
  network: { id: string; eventType: string; label: string; createdAt: string }[];
}): ReplayTimelineEvent[] {
  const events: ReplayTimelineEvent[] = [];
  const { fixtureId } = input;

  for (const s of input.snapshots) {
    if (s.pressureScore >= 70) {
      events.push({
        id: `pr-${fixtureId}-${s.minute}-${s.recordedAt}`,
        fixtureId,
        minute: s.minute,
        kind: "pressure",
        label: `${s.minute}' · pressão ${Math.round(s.pressureScore)}`,
        at: s.recordedAt,
      });
    }
  }

  for (const c of input.contexts) {
    if (c.contextScore >= 65) {
      events.push({
        id: `ctx-${fixtureId}-${c.minute}-${c.recordedAt}`,
        fixtureId,
        minute: c.minute,
        kind: "context",
        label: `${c.minute}' · contexto ${Math.round(c.contextScore)} (${c.contextLevel})`,
        at: c.recordedAt,
      });
    }
  }

  for (const p of input.predictive) {
    if (p.marketLagScore >= 0.55) {
      events.push({
        id: `mkt-${fixtureId}-${p.minute}-${p.recordedAt}`,
        fixtureId,
        minute: p.minute,
        kind: "market",
        label: `${p.minute}' · mercado atrasado`,
        at: p.recordedAt,
      });
    }
  }

  for (const a of input.alerts) {
    events.push({
      id: `tg-${fixtureId}-${a.minute}-${a.recordedAt}`,
      fixtureId,
      minute: a.minute,
      kind: "telegram",
      label: `${a.minute}' · alerta Telegram ${a.headline ? `— ${a.headline}` : ""}`,
      at: a.recordedAt,
    });
  }

  for (const n of input.network) {
    events.push({
      id: `net-${n.id}`,
      fixtureId,
      minute: minuteFromIso(input.kickOffAt, n.createdAt),
      kind: n.eventType.includes("consensus") ? "consensus" : "gpi",
      label: n.label,
      at: n.createdAt,
    });
  }

  return events.sort((a, b) => a.minute - b.minute);
}
