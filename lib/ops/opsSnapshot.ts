import { signalDispatcher } from "@/lib/telegram/signalDispatcher";
import {
  getTelegramConfig,
  isTelegramConfigured,
} from "@/lib/telegram/telegramClient";
import { getOpsStoreSnapshot } from "@/lib/ops/opsStore";
import type { OpsApiSuccessResponse, OpsTelegramStatus } from "@/types/opsApi";

function buildTelegramStatus(): OpsTelegramStatus {
  const config = getTelegramConfig();
  const configured = isTelegramConfigured();

  let status: OpsTelegramStatus["status"] = "OFFLINE";
  if (config.sandboxMode) status = "SANDBOX";
  else if (configured) status = "READY";

  return {
    sandboxMode: config.sandboxMode,
    configured,
    status,
    botTokenSet: Boolean(config.botToken),
    chatIdSet: Boolean(config.chatId),
  };
}

export async function buildOpsApiPayload(
  responseTimeMs: number
): Promise<OpsApiSuccessResponse> {
  const [store, queueStats] = await Promise.all([
    getOpsStoreSnapshot(),
    Promise.resolve(signalDispatcher.getQueueStats()),
  ]);

  return {
    ok: true,
    telegram: buildTelegramStatus(),
    queue: {
      queueSize: queueStats.pending,
      processing: queueStats.processing,
      cooldownEntries: queueStats.recentFingerprints,
    },
    counters: store.counters,
    recentDispatches: store.recentDispatches,
    logs: store.logs,
    meta: {
      fetchedAt: new Date().toISOString(),
      responseTimeMs,
      historyUpdatedAt: store.historyUpdatedAt,
    },
  };
}
