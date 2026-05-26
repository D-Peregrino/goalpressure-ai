import {
  getTelegramConfig,
  sendTelegramMessageToChat,
} from "@/lib/telegram/telegramClient";
import {
  listActiveTelegramDestinations,
  resolveTelegramDestinations,
} from "@/lib/telegram/telegramDestinations";
import type {
  TelegramRouteContext,
  TelegramRoutedSendResult,
} from "@/lib/telegram/telegramDestination.types";
import {
  persistTelegramDispatchLog,
  routeContextToLogTags,
} from "@/lib/telegram/telegramDispatchLogPersistence";
import { logInfo, logWarn } from "@/lib/utils/logger";

const LOG_SCOPE = "telegram-routing";

/**
 * Envia para destinos Supabase (segmentação) ou fallback TELEGRAM_CHAT_ID.
 */
export async function sendTelegramRouted(
  text: string,
  ctx: TelegramRouteContext,
  options?: { signalId?: string; source?: string }
): Promise<TelegramRoutedSendResult> {
  const started = Date.now();
  const destinations = await resolveTelegramDestinations(ctx);
  const logTags = routeContextToLogTags(ctx);
  const preview = text.slice(0, 280);

  if (destinations.length === 0) {
    const config = getTelegramConfig();
    if (!config.chatId) {
      await persistTelegramDispatchLog({
        pipeline: ctx.pipeline,
        alertType: ctx.alertType,
        priority: ctx.priority,
        fixtureId: ctx.fixtureId,
        signalId: options?.signalId ?? ctx.signalId,
        status: "skipped",
        errorMessage: "no_destinations",
        messagePreview: preview,
        tags: logTags,
      });
      return {
        ok: false,
        sandbox: false,
        delivered: 0,
        failed: 0,
        skipped: 1,
        results: [],
        error: "no_destinations",
      };
    }

    const single = await sendTelegramMessageToChat(text, config.chatId, {
      signalId: options?.signalId ?? ctx.signalId,
      source: options?.source ?? ctx.pipeline,
    });
    const latencyMs = Date.now() - started;

    await persistTelegramDispatchLog({
      chatId: config.chatId,
      pipeline: ctx.pipeline,
      alertType: ctx.alertType,
      priority: ctx.priority,
      fixtureId: ctx.fixtureId,
      signalId: options?.signalId ?? ctx.signalId,
      status: single.sandbox ? "sandbox" : single.ok ? "sent" : "failed",
      errorMessage: single.error,
      messagePreview: preview,
      telegramMessageId: single.messageId,
      latencyMs,
      tags: logTags,
      metadata: { fallback: "env_chat_id" },
    });

    return {
      ok: single.ok || single.sandbox,
      sandbox: single.sandbox,
      delivered: single.ok || single.sandbox ? 1 : 0,
      failed: single.ok || single.sandbox ? 0 : 1,
      skipped: 0,
      results: [
        {
          destinationId: null,
          destinationName: "Env fallback",
          chatId: config.chatId,
          ok: single.ok || single.sandbox,
          error: single.error,
          messageId: single.messageId,
        },
      ],
      error: single.error,
    };
  }

  const results: TelegramRoutedSendResult["results"] = [];
  let delivered = 0;
  let failed = 0;

  for (const dest of destinations) {
    const t0 = Date.now();
    const send = await sendTelegramMessageToChat(text, dest.chat_id, {
      signalId: options?.signalId ?? ctx.signalId,
      source: options?.source ?? ctx.pipeline,
    });
    const latencyMs = Date.now() - t0;

    if (send.ok || send.sandbox) delivered += 1;
    else failed += 1;

    results.push({
      destinationId: dest.id,
      destinationName: dest.name,
      chatId: dest.chat_id,
      ok: send.ok || send.sandbox,
      error: send.error,
      messageId: send.messageId,
    });

    void persistTelegramDispatchLog({
      destinationId: dest.id,
      destinationName: dest.name,
      chatId: dest.chat_id,
      pipeline: ctx.pipeline,
      alertType: ctx.alertType,
      priority: ctx.priority,
      fixtureId: ctx.fixtureId,
      signalId: options?.signalId ?? ctx.signalId,
      status: send.sandbox ? "sandbox" : send.ok ? "sent" : "failed",
      errorMessage: send.error,
      messagePreview: preview,
      telegramMessageId: send.messageId,
      latencyMs,
      tags: logTags,
    });
  }

  const ok = delivered > 0;
  if (ok) {
    logInfo(LOG_SCOPE, "Routed Telegram dispatch", {
      pipeline: ctx.pipeline,
      delivered,
      failed,
      destinations: destinations.length,
    });
  } else {
    logWarn(LOG_SCOPE, "Routed Telegram dispatch failed", {
      pipeline: ctx.pipeline,
      failed,
    });
  }

  return {
    ok,
    sandbox: results.some((r) => r.ok) && getTelegramConfig().sandboxMode,
    delivered,
    failed,
    skipped: 0,
    results,
  };
}

/** Destinos ativos ou env — para health checks. */
export async function isTelegramRoutingConfigured(): Promise<boolean> {
  const active = await listActiveTelegramDestinations();
  if (active.length > 0) return true;
  const { botToken, chatId } = getTelegramConfig();
  return Boolean(botToken && chatId);
}
