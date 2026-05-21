import {
  getTelegramConfig,
  isTelegramConfigured,
  probeTelegramConnection,
} from "@/lib/telegram/telegramClient";
import {
  getAverageDispatchLatencyMs,
  getTelegramDispatchState,
} from "@/lib/telegram/telegramDispatchState";

export interface TelegramHealthDetail {
  configured: boolean;
  sandbox: boolean;
  connected: boolean;
  status: "ONLINE" | "SANDBOX" | "OFFLINE" | "READY";
  lastDispatch: string | null;
  lastDispatchSignalId: string | null;
  averageLatencyMs: number;
  totalSent: number;
  totalFailed: number;
}

export async function getTelegramHealthDetail(): Promise<TelegramHealthDetail> {
  const config = getTelegramConfig();
  const configured = isTelegramConfigured();
  const dispatchState = getTelegramDispatchState();

  let connected = false;
  if (config.sandboxMode) {
    connected = configured;
  } else if (configured) {
    connected = await probeTelegramConnection();
  }

  let status: TelegramHealthDetail["status"] = "OFFLINE";
  if (!configured) status = "OFFLINE";
  else if (config.sandboxMode) status = "SANDBOX";
  else if (connected) status = "ONLINE";
  else status = "READY";

  return {
    configured,
    sandbox: config.sandboxMode,
    connected,
    status,
    lastDispatch: dispatchState.lastDispatchAt,
    lastDispatchSignalId: dispatchState.lastDispatchSignalId,
    averageLatencyMs: getAverageDispatchLatencyMs(),
    totalSent: dispatchState.totalSent,
    totalFailed: dispatchState.totalFailed,
  };
}
