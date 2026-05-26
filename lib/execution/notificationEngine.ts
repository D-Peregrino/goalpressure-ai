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

export { buildInstitutionalDispatchMessage } from "@/lib/execution/telegramMessageBuilder";

export function urgencyLabel(u: DispatchUrgency): string {
  const map: Record<DispatchUrgency, string> = {
    LOW: "Baixa",
    MEDIUM: "Média",
    HIGH: "Alta",
    CRITICAL: "Crítica",
  };
  return map[u];
}
