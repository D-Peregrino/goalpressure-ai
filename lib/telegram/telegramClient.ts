import { logError, logInfo, logWarn } from "@/lib/utils/logger";
import type { TelegramConfig, TelegramSendResult } from "@/types/telegram";
import type { TelegramRouteContext } from "@/lib/telegram/telegramDestination.types";
import { sendTelegramRouted } from "@/lib/telegram/telegramRouting";

const LOG_SCOPE = "telegram-client";
const TELEGRAM_API_BASE = "https://api.telegram.org";

function parseSandboxMode(value: string | undefined): boolean {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

/**
 * Reads Telegram configuration from environment (server-side only).
 * Defaults to sandbox mode when unset — no real messages are sent.
 */
export function getTelegramConfig(): TelegramConfig {
  const sandboxMode = parseSandboxMode(process.env.TELEGRAM_SANDBOX_MODE);
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim() || null;
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim() || null;

  return {
    botToken,
    chatId,
    sandboxMode,
  };
}

export function isTelegramSandboxMode(): boolean {
  return getTelegramConfig().sandboxMode;
}

export function isTelegramConfigured(): boolean {
  const { botToken, chatId } = getTelegramConfig();
  return Boolean(botToken && chatId);
}

let lastProbeAt = 0;
let lastProbeResult = false;
const PROBE_CACHE_MS = 60_000;

/**
 * Verifies bot token via getMe (cached 60s). Sandbox returns true when configured.
 */
export async function probeTelegramConnection(): Promise<boolean> {
  const config = getTelegramConfig();

  if (config.sandboxMode) {
    return isTelegramConfigured();
  }

  if (!config.botToken) return false;

  const now = Date.now();
  if (now - lastProbeAt < PROBE_CACHE_MS) return lastProbeResult;

  try {
    const url = `${TELEGRAM_API_BASE}/bot${config.botToken}/getMe`;
    const response = await fetch(url, { method: "GET", cache: "no-store" });
    const body = (await response.json()) as { ok?: boolean };
    lastProbeResult = Boolean(response.ok && body.ok);
    lastProbeAt = now;
    return lastProbeResult;
  } catch {
    lastProbeResult = false;
    lastProbeAt = now;
    return false;
  }
}

const RETRY_DELAYS_MS = [500, 1500, 3000];

export interface TelegramSendOptions {
  signalId?: string;
  source?: string;
  chatId?: string;
  route?: TelegramRouteContext;
}

/**
 * Sends with up to 3 attempts — never throws.
 * When `route` is set, uses Supabase destinations + segmentation.
 */
export async function sendTelegramMessageWithRetry(
  text: string,
  options?: TelegramSendOptions & { maxAttempts?: number }
): Promise<TelegramSendResult> {
  if (options?.route) {
    const routed = await sendTelegramRouted(text, options.route, {
      signalId: options.signalId,
      source: options.source,
    });
    return {
      ok: routed.ok,
      sandbox: routed.sandbox,
      error: routed.error,
      messageId: routed.results[0]?.messageId,
    };
  }

  const maxAttempts = options?.maxAttempts ?? 3;
  let lastResult: TelegramSendResult = { ok: false, sandbox: false, error: "no_attempt" };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    lastResult = await sendTelegramMessage(text, options);

    if (lastResult.ok || lastResult.sandbox) return lastResult;

    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt - 1] ?? 2000));
    }
  }

  return lastResult;
}

/**
 * Sends a message to a specific chat (used by routing layer).
 */
export async function sendTelegramMessageToChat(
  text: string,
  chatId: string,
  options?: { signalId?: string; source?: string }
): Promise<TelegramSendResult> {
  return sendTelegramMessage(text, { ...options, chatId });
}

/**
 * Sends a message via Telegram Bot API, or logs payload in sandbox mode.
 */
export async function sendTelegramMessage(
  text: string,
  options?: TelegramSendOptions
): Promise<TelegramSendResult> {
  const config = getTelegramConfig();
  const targetChatId = options?.chatId ?? config.chatId;

  if (config.sandboxMode) {
    logInfo(LOG_SCOPE, "Sandbox dispatch", {
      signalId: options?.signalId,
      source: options?.source,
      sandbox: true,
      chatId: targetChatId ?? "(not set)",
      payloadPreview: text.slice(0, 200),
      payloadLength: text.length,
    });

    return {
      ok: true,
      sandbox: true,
      messageId: `sandbox-${Date.now()}`,
    };
  }

  if (!config.botToken || !targetChatId) {
    const error = "Telegram credentials missing (TELEGRAM_BOT_TOKEN / chat_id)";
    logWarn(LOG_SCOPE, "Telegram send failed", { error, signalId: options?.signalId });
    return { ok: false, sandbox: false, error };
  }

  try {
    const url = `${TELEGRAM_API_BASE}/bot${config.botToken}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: targetChatId,
        text,
        disable_web_page_preview: true,
      }),
    });

    const body = (await response.json()) as {
      ok?: boolean;
      description?: string;
      result?: { message_id?: number };
    };

    if (!response.ok || !body.ok) {
      const error = body.description ?? `HTTP ${response.status}`;
      logError(LOG_SCOPE, "Telegram send failed", {
        error,
        signalId: options?.signalId,
      });
      return { ok: false, sandbox: false, error };
    }

    logInfo(LOG_SCOPE, "Telegram send success", {
      signalId: options?.signalId,
      messageId: body.result?.message_id,
      chatId: targetChatId,
    });

    return {
      ok: true,
      sandbox: false,
      messageId: body.result?.message_id
        ? String(body.result.message_id)
        : undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logError(LOG_SCOPE, "Telegram send failed", {
      error: message,
      signalId: options?.signalId,
    });
    return { ok: false, sandbox: false, error: message };
  }
}
