import type { QueuedDispatch } from "@/lib/execution/execution.types";
import { buildInstitutionalDispatchMessage } from "@/lib/execution/notificationEngine";
import {
  isTelegramConfigured,
  isTelegramSandboxMode,
  sendTelegramMessageWithRetry,
} from "@/lib/telegram/telegramClient";
import { logWarn } from "@/lib/utils/logger";

const LOG_SCOPE = "telegram-live-engine";

/**
 * Telegram live signal engine — formato institucional.
 * TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID (sandbox se TELEGRAM_SANDBOX_MODE=true).
 */
export async function sendTelegramLiveDispatch(
  item: QueuedDispatch
): Promise<boolean> {
  if (!isTelegramConfigured()) return false;

  const text = buildInstitutionalDispatchMessage(item);

  if (isTelegramSandboxMode()) {
    return true;
  }

  try {
    const result = await sendTelegramMessageWithRetry(text);
    return result.ok;
  } catch (e) {
    logWarn(LOG_SCOPE, "Telegram send failed", {
      message: e instanceof Error ? e.message : String(e),
    });
    return false;
  }
}
