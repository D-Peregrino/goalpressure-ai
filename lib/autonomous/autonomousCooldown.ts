import type {
  AutonomousAlertKind,
  AutonomousAlertPriority,
} from "@/lib/autonomous/autonomousAlert.types";
import { priorityRank } from "@/lib/autonomous/autonomousAlertConfig";

const COOLDOWN_BY_TYPE_MS: Record<AutonomousAlertKind, number> = {
  PRESSAO_EXTREMA: 120_000,
  OPORTUNIDADE_CONTEXTUAL: 150_000,
  DISTORCAO_COTACAO: 180_000,
  MUDANCA_RITMO: 120_000,
  SEQUENCIA_OFENSIVA: 90_000,
  ZONA_CRITICA: 90_000,
  FIM_JOGO_CRITICO: 120_000,
  CONTEXTO_DESACELERANDO: 150_000,
  LEITURA_ENCERRADA: 300_000,
};

const COOLDOWN_BY_FIXTURE_MS = 75_000;
const TEXT_DEDUP_MS = 240_000;

const lastByType = new Map<string, number>();
const lastByFixture = new Map<string, number>();
const lastByText = new Map<string, number>();
const lastPriorityByFixture = new Map<string, number>();

function typeKey(fixtureId: string, kind: AutonomousAlertKind): string {
  return `${fixtureId}|${kind}`;
}

export interface AutonomousCooldownDecision {
  allowed: boolean;
  reason?: string;
}

export function shouldAllowAutonomousAlertSend(params: {
  fixtureId: string;
  kind: AutonomousAlertKind;
  priority: AutonomousAlertPriority;
  textFingerprint: string;
  escalated: boolean;
}): AutonomousCooldownDecision {
  const now = Date.now();
  const { fixtureId, kind, priority, textFingerprint, escalated } = params;

  const prevPriority = lastPriorityByFixture.get(fixtureId) ?? 0;
  const rank = priorityRank(priority);
  const isEscalation = escalated && rank > prevPriority;

  const textKey = `${fixtureId}|${textFingerprint}`;
  const lastText = lastByText.get(textKey);
  if (lastText != null && now - lastText < TEXT_DEDUP_MS && !isEscalation) {
    return { allowed: false, reason: "texto_repetido" };
  }

  const tKey = typeKey(fixtureId, kind);
  const lastType = lastByType.get(tKey);
  const typeCooldown = COOLDOWN_BY_TYPE_MS[kind] ?? 120_000;
  if (lastType != null && now - lastType < typeCooldown && !isEscalation) {
    return { allowed: false, reason: "cooldown_tipo" };
  }

  const lastFix = lastByFixture.get(fixtureId);
  if (lastFix != null && now - lastFix < COOLDOWN_BY_FIXTURE_MS && !isEscalation) {
    return { allowed: false, reason: "cooldown_fixture" };
  }

  return { allowed: true };
}

export function markAutonomousAlertSent(params: {
  fixtureId: string;
  kind: AutonomousAlertKind;
  priority: AutonomousAlertPriority;
  textFingerprint: string;
}): void {
  const now = Date.now();
  const { fixtureId, kind, priority, textFingerprint } = params;
  lastByType.set(typeKey(fixtureId, kind), now);
  lastByFixture.set(fixtureId, now);
  lastByText.set(`${fixtureId}|${textFingerprint}`, now);
  lastPriorityByFixture.set(fixtureId, Math.max(lastPriorityByFixture.get(fixtureId) ?? 0, priorityRank(priority)));
  pruneAutonomousCooldownMemory();
}

export function clearAutonomousFixtureState(fixtureId: string): void {
  lastByFixture.delete(fixtureId);
  lastPriorityByFixture.delete(fixtureId);
  for (const key of lastByType.keys()) {
    if (key.startsWith(`${fixtureId}|`)) lastByType.delete(key);
  }
}

function pruneAutonomousCooldownMemory(): void {
  const now = Date.now();
  const maxAge = 600_000;
  for (const [k, t] of lastByType) {
    if (now - t > maxAge) lastByType.delete(k);
  }
  for (const [k, t] of lastByFixture) {
    if (now - t > maxAge) lastByFixture.delete(k);
  }
  for (const [k, t] of lastByText) {
    if (now - t > maxAge) lastByText.delete(k);
  }
}
