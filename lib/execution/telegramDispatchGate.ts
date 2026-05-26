import type { PremiumTelegramPayload } from "@/lib/execution/telegramMessageBuilder";
import type { QueuedDispatch } from "@/lib/execution/execution.types";
import type { TelegramVisualLevel } from "@/lib/execution/telegramTemplates";

const CONTEXT_COOLDOWN_MS: Record<TelegramVisualLevel, number> = {
  neutro: 300_000,
  monitoramento: 180_000,
  alerta: 120_000,
  oportunidade: 90_000,
  critico: 60_000,
  evitar: 120_000,
};

const lastByFingerprint = new Map<string, number>();
const lastByFixtureLevel = new Map<string, number>();

export interface TelegramGateResult {
  allowed: boolean;
  reason?: string;
}

function isRelevantDispatch(item: QueuedDispatch, level: TelegramVisualLevel): boolean {
  if (item.urgency === "CRITICAL" || item.urgency === "HIGH") return true;
  if (level === "critico" || level === "alerta" || level === "oportunidade") return true;
  if (item.urgency === "MEDIUM" && item.pressureScore >= 62) return true;
  if (item.source === "EV_ENGINE" && (item.evPercent ?? 0) >= 4) return true;
  return false;
}

export function shouldSendPremiumTelegram(
  item: QueuedDispatch,
  payload: PremiumTelegramPayload
): TelegramGateResult {
  if (!isRelevantDispatch(item, payload.level)) {
    return { allowed: false, reason: "contexto_insuficiente" };
  }

  const now = Date.now();
  const fp = payload.fingerprint;
  const lastFp = lastByFingerprint.get(fp);
  const cooldownFp = CONTEXT_COOLDOWN_MS[payload.level];

  if (lastFp != null && now - lastFp < cooldownFp) {
    return { allowed: false, reason: "cooldown_contextual" };
  }

  const fixtureKey = `${item.fixtureId}|${payload.level}`;
  const lastFixture = lastByFixtureLevel.get(fixtureKey);
  const minGap = Math.min(cooldownFp, 90_000);

  if (lastFixture != null && now - lastFixture < minGap) {
    return { allowed: false, reason: "cooldown_fixture" };
  }

  return { allowed: true };
}

export function markPremiumTelegramSent(payload: PremiumTelegramPayload): void {
  const now = Date.now();
  lastByFingerprint.set(payload.fingerprint, now);
  lastByFixtureLevel.set(`${payload.fixtureId}|${payload.level}`, now);
  pruneTelegramGateMemory();
}

function pruneTelegramGateMemory(): void {
  const now = Date.now();
  const maxAge = 600_000;
  for (const [k, t] of lastByFingerprint) {
    if (now - t > maxAge) lastByFingerprint.delete(k);
  }
  for (const [k, t] of lastByFixtureLevel) {
    if (now - t > maxAge) lastByFixtureLevel.delete(k);
  }
}

let lastRoundSummaryAt = 0;
let lastTopMonitoredAt = 0;

const ROUND_SUMMARY_GAP_MS = 3_600_000;
const TOP_MONITORED_GAP_MS = 1_800_000;

export function canSendRoundSummary(): boolean {
  const now = Date.now();
  if (now - lastRoundSummaryAt < ROUND_SUMMARY_GAP_MS) return false;
  lastRoundSummaryAt = now;
  return true;
}

export function canSendTopMonitored(): boolean {
  const now = Date.now();
  if (now - lastTopMonitoredAt < TOP_MONITORED_GAP_MS) return false;
  lastTopMonitoredAt = now;
  return true;
}
