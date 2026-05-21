/**
 * In-process Telegram dispatch telemetry (health + ops).
 */

export interface TelegramDispatchState {
  lastDispatchAt: string | null;
  lastDispatchSignalId: string | null;
  lastDispatchOk: boolean | null;
  lastError: string | null;
  totalSent: number;
  totalFailed: number;
  latencySamplesMs: number[];
  connected: boolean | null;
  lastConnectedCheckAt: string | null;
}

interface GlobalTelegramSlot {
  state: TelegramDispatchState;
}

declare global {
  // eslint-disable-next-line no-var
  var __GP_TELEGRAM__: GlobalTelegramSlot | undefined;
}

function getSlot(): GlobalTelegramSlot {
  if (!globalThis.__GP_TELEGRAM__) {
    globalThis.__GP_TELEGRAM__ = {
      state: {
        lastDispatchAt: null,
        lastDispatchSignalId: null,
        lastDispatchOk: null,
        lastError: null,
        totalSent: 0,
        totalFailed: 0,
        latencySamplesMs: [],
        connected: null,
        lastConnectedCheckAt: null,
      },
    };
  }
  return globalThis.__GP_TELEGRAM__;
}

export function getTelegramDispatchState(): TelegramDispatchState {
  return { ...getSlot().state, latencySamplesMs: [...getSlot().state.latencySamplesMs] };
}

export function recordTelegramDispatchSuccess(
  signalId: string,
  latencyMs: number
): void {
  const s = getSlot().state;
  s.lastDispatchAt = new Date().toISOString();
  s.lastDispatchSignalId = signalId;
  s.lastDispatchOk = true;
  s.lastError = null;
  s.totalSent += 1;
  s.latencySamplesMs.push(latencyMs);
  if (s.latencySamplesMs.length > 100) {
    s.latencySamplesMs.shift();
  }
}

export function recordTelegramDispatchFailure(
  signalId: string,
  error: string,
  latencyMs: number
): void {
  const s = getSlot().state;
  s.lastDispatchAt = new Date().toISOString();
  s.lastDispatchSignalId = signalId;
  s.lastDispatchOk = false;
  s.lastError = error;
  s.totalFailed += 1;
  s.latencySamplesMs.push(latencyMs);
  if (s.latencySamplesMs.length > 100) {
    s.latencySamplesMs.shift();
  }
}

export function setTelegramConnected(connected: boolean): void {
  const s = getSlot().state;
  s.connected = connected;
  s.lastConnectedCheckAt = new Date().toISOString();
}

export function getAverageDispatchLatencyMs(): number {
  const samples = getSlot().state.latencySamplesMs;
  if (samples.length === 0) return 0;
  return Math.round(
    samples.reduce((a, b) => a + b, 0) / samples.length
  );
}
