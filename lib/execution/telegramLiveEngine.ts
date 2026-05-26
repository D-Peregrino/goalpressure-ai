import type { ExecutedDispatch, QueuedDispatch } from "@/lib/execution/execution.types";
import {
  buildMatchEndMessage,
  buildPremiumTelegramPayload,
  buildRoundSummaryMessage,
  buildTopMonitoredMessage,
} from "@/lib/execution/telegramMessageBuilder";
import {
  canSendRoundSummary,
  canSendTopMonitored,
  markPremiumTelegramSent,
  shouldSendPremiumTelegram,
} from "@/lib/execution/telegramDispatchGate";
import { appendTelegramMessageLog } from "@/lib/execution/telegramMessageLog";
import {
  isTelegramConfigured,
  isTelegramSandboxMode,
  sendTelegramMessageWithRetry,
} from "@/lib/telegram/telegramClient";
import { logInfo, logWarn } from "@/lib/utils/logger";

const LOG_SCOPE = "telegram-live-engine";

export interface TelegramLiveSendResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  sandbox?: boolean;
  preview?: string;
}

async function deliverTelegramText(
  text: string,
  meta: {
    kind: "contextual_reading" | "round_summary" | "top_monitored" | "match_end";
    level: string;
    fixtureId: string | null;
    matchLabel: string | null;
  }
): Promise<TelegramLiveSendResult> {
  const sandbox = isTelegramSandboxMode();

  appendTelegramMessageLog({
    kind: meta.kind,
    level: meta.level as import("@/lib/execution/telegramTemplates").TelegramVisualLevel,
    fixtureId: meta.fixtureId,
    matchLabel: meta.matchLabel,
    preview: text.slice(0, 280),
    fullText: text,
    sentAt: new Date().toISOString(),
    sandbox,
    delivered: false,
  });

  if (!isTelegramConfigured()) {
    return { ok: false, skipped: true, reason: "not_configured" };
  }

  if (sandbox) {
    logInfo(LOG_SCOPE, "Sandbox — mensagem operacional premium", {
      kind: meta.kind,
      fixtureId: meta.fixtureId,
      length: text.length,
      preview: text.slice(0, 160),
    });
    return { ok: true, sandbox: true, preview: text };
  }

  try {
    const result = await sendTelegramMessageWithRetry(text, {
      source: "premium-operational",
      signalId: meta.fixtureId ?? undefined,
    });
    if (result.ok) {
      logInfo(LOG_SCOPE, "Telegram premium enviado", { kind: meta.kind, fixtureId: meta.fixtureId });
    }
    return { ok: result.ok, sandbox: false, reason: result.error };
  } catch (e) {
    logWarn(LOG_SCOPE, "Telegram send failed", {
      message: e instanceof Error ? e.message : String(e),
    });
    return { ok: false, reason: "send_error" };
  }
}

/**
 * Telegram operacional premium — ContextEngine + decisão operacional, anti-spam e histórico.
 */
export async function sendTelegramLiveDispatch(
  item: QueuedDispatch
): Promise<boolean> {
  const payload = buildPremiumTelegramPayload(item);
  const gate = shouldSendPremiumTelegram(item, payload);

  if (!gate.allowed) {
    logInfo(LOG_SCOPE, "Telegram suprimido", {
      fixtureId: item.fixtureId,
      reason: gate.reason,
      level: payload.level,
    });
    return false;
  }

  const result = await deliverTelegramText(payload.text, {
    kind: "contextual_reading",
    level: payload.level,
    fixtureId: payload.fixtureId,
    matchLabel: payload.matchLabel,
  });

  if (result.ok) {
    markPremiumTelegramSent(payload);
  }

  return result.ok;
}

/** Mensagens agregadas pós-lote (resumo / top monitorados). */
export async function sendTelegramBatchDigests(
  executed: ExecutedDispatch[]
): Promise<{ roundSummary: boolean; topMonitored: boolean }> {
  const out = { roundSummary: false, topMonitored: false };
  if (executed.length === 0) return out;

  const topMsg = buildTopMonitoredMessage(executed);
  if (topMsg && canSendTopMonitored() && executed.length >= 3) {
    const r = await deliverTelegramText(topMsg, {
      kind: "top_monitored",
      level: "monitoramento",
      fixtureId: null,
      matchLabel: null,
    });
    out.topMonitored = r.ok;
  }

  const roundMsg = buildRoundSummaryMessage(executed);
  if (roundMsg && canSendRoundSummary() && executed.length >= 4) {
    const r = await deliverTelegramText(roundMsg, {
      kind: "round_summary",
      level: "neutro",
      fixtureId: null,
      matchLabel: null,
    });
    out.roundSummary = r.ok;
  }

  return out;
}

/** Encerramento de partida (ex.: minuto final / status FT). */
export async function sendTelegramMatchEnd(item: QueuedDispatch): Promise<boolean> {
  const text = buildMatchEndMessage(item);
  const payload = buildPremiumTelegramPayload(item);
  const result = await deliverTelegramText(text, {
    kind: "match_end",
    level: payload.level,
    fixtureId: item.fixtureId,
    matchLabel: item.matchLabel,
  });
  return result.ok;
}

/** Envio direto de texto operacional (alertas autônomos). */
export async function sendPremiumTelegramRaw(
  text: string,
  meta: {
    kind: "contextual_reading" | "round_summary" | "top_monitored" | "match_end";
    level: string;
    fixtureId: string | null;
    matchLabel: string | null;
  }
): Promise<TelegramLiveSendResult> {
  return deliverTelegramText(text, meta);
}

export { getTelegramMessageHistory, getTelegramSandboxPreview } from "@/lib/execution/telegramMessageLog";
export {
  buildPremiumOperationalTelegramMessage,
  buildInstitutionalDispatchMessage,
} from "@/lib/execution/telegramMessageBuilder";
