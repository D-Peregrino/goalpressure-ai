import type {
  DispatchCandidate,
  DispatchUrgency,
  PushNotificationKind,
  PushNotificationPayload,
  QueuedDispatch,
} from "@/lib/execution/execution.types";

export function resolvePushKind(
  candidate: DispatchCandidate
): PushNotificationKind {
  if (candidate.temperature === "IGNITE") return "ignite_match";
  if ((candidate.evPercent ?? 0) >= 8) return "ev_extreme";
  if (candidate.minute >= 70) return "late_goal";
  if (candidate.pressureScore >= 72) return "pressure_spike";
  return "operational_focus";
}

export function buildPushNotification(
  item: QueuedDispatch
): PushNotificationPayload {
  const kind = resolvePushKind(item);
  const titles: Record<PushNotificationKind, string> = {
    pressure_spike: "Pressão ofensiva elevada",
    ev_extreme: "EV extremo detectado",
    late_goal: "Janela tardia operacional",
    operational_focus: "Foco operacional",
    ignite_match: "Partida em ignição",
  };

  return {
    id: `push-${item.id}`,
    kind,
    title: titles[kind],
    body: `${item.matchLabel} · ${item.headline}. ${item.narrative.slice(0, 120)}`,
    fixtureId: item.fixtureId,
    urgency: item.urgency,
    createdAt: new Date().toISOString(),
  };
}

export function buildInstitutionalDispatchMessage(item: QueuedDispatch): string {
  const ev =
    item.evPercent != null ? `EV +${item.evPercent.toFixed(1)}%` : "EV —";
  const fair = item.fairOdd != null ? item.fairOdd.toFixed(2) : "—";
  const market = item.marketOdd != null ? item.marketOdd.toFixed(2) : "—";
  const risk = item.riskContext ?? "—";

  return [
    "GOALPRESSURE · LEITURA OPERACIONAL",
    item.headline,
    `${item.matchLabel} · ${item.scoreDisplay} · ${item.minute}'`,
    `${ev} · Justa ${fair} · Mercado ${market}`,
    `Pressão ${Math.round(item.pressureScore)} · Urgência ${item.urgency}`,
    `Risco ${risk}`,
    item.narrative.slice(0, 280),
  ].join("\n");
}

export function urgencyLabel(u: DispatchUrgency): string {
  const map: Record<DispatchUrgency, string> = {
    LOW: "Baixa",
    MEDIUM: "Média",
    HIGH: "Alta",
    CRITICAL: "Crítica",
  };
  return map[u];
}
