import { logError, logInfo, logWarn } from "@/lib/utils/logger";
import type { TelegramConfig, TelegramSendResult } from "@/types/telegram";

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

/**
 * Sends with up to 3 attempts — never throws.
 */
export async function sendTelegramMessageWithRetry(
  text: string,
  options?: { signalId?: string; source?: string; maxAttempts?: number }
): Promise<TelegramSendResult> {
  const maxAttempts = options?.maxAttempts ?? 3;
  let lastResult: TelegramSendResult = { ok: false, sandbox: false, error: "no_attempt" };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    lastResult = await sendTelegramMessage(text, {
      signalId: options?.signalId,
      source: options?.source,
    });

    if (lastResult.ok || lastResult.sandbox) return lastResult;

    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt - 1] ?? 2000));
    }
  }

  return lastResult;
}

/**
 * Sends a message via Telegram Bot API, or logs payload in sandbox mode.
 */
export async function sendTelegramMessage(
  text: string,
  options?: { signalId?: string; source?: string }
): Promise<TelegramSendResult> {
  const config = getTelegramConfig();

  if (config.sandboxMode) {
    logInfo(LOG_SCOPE, "Sandbox dispatch", {
      signalId: options?.signalId,
      source: options?.source,
      sandbox: true,
      chatId: config.chatId ?? "(not set)",
      payloadPreview: text.slice(0, 200),
      payloadLength: text.length,
    });

    return {
      ok: true,
      sandbox: true,
      messageId: `sandbox-${Date.now()}`,
    };
  }

  if (!config.botToken || !config.chatId) {
    const error = "Telegram credentials missing (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID)";
    logWarn(LOG_SCOPE, "Telegram send failed", { error, signalId: options?.signalId });
    return { ok: false, sandbox: false, error };
  }

  try {
    const url = `${TELEGRAM_API_BASE}/bot${config.botToken}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: config.chatId,
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
      chatId: config.chatId,
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
