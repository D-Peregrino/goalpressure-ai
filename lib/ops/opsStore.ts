/**
 * Operational observability store — tracks Telegram dispatch pipeline events
 * and persists to data/ops/ops-history.json.
 */

import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type {
  OpsCounterMetrics,
  OpsDispatchRecord,
  OpsDispatchStatus,
  OpsEventType,
  OpsLogEntry,
  OpsLogLevel,
} from "@/types/opsApi";
import type { TelegramSignalSource } from "@/types/telegram";
import type { MarketType } from "@/types/domain";

const OPS_DIR = path.join(process.cwd(), "data", "ops");
const HISTORY_FILE = path.join(OPS_DIR, "ops-history.json");
const MAX_DISPATCHES = 100;
const MAX_LOGS = 200;

export interface RecordOpsEventInput {
  event: OpsEventType;
  signalId: string;
  modelId: string;
  source: TelegramSignalSource;
  matchId: string;
  market: MarketType;
  status: OpsDispatchStatus;
  latencyMs?: number;
  error?: string;
  message: string;
  level?: OpsLogLevel;
}

interface OpsHistoryDocument {
  updatedAt: string;
  counters: OpsCounterMetrics;
  recentDispatches: OpsDispatchRecord[];
  logs: OpsLogEntry[];
}

const defaultCounters: OpsCounterMetrics = {
  totalQueued: 0,
  totalDispatched: 0,
  duplicateSkips: 0,
  cooldownBlocked: 0,
  sendSuccess: 0,
  sendFailed: 0,
  sandboxDispatches: 0,
  dispatchRatePerMin: 0,
  failRate: 0,
};

let counters: OpsCounterMetrics = { ...defaultCounters };
let recentDispatches: OpsDispatchRecord[] = [];
let logs: OpsLogEntry[] = [];
let historyUpdatedAt: string | null = null;
let persistPromise: Promise<void> | null = null;
let loaded = false;

function generateLogId(): string {
  return `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function computeDispatchRatePerMin(records: OpsDispatchRecord[]): number {
  const cutoff = Date.now() - 60_000;
  return records.filter(
    (r) =>
      new Date(r.timestamp).getTime() >= cutoff &&
      (r.status === "dispatched" || r.status === "sandbox")
  ).length;
}

function computeFailRate(c: OpsCounterMetrics): number {
  const attempts = c.sendSuccess + c.sendFailed;
  if (attempts === 0) return 0;
  return Math.round((c.sendFailed / attempts) * 1000) / 1000;
}

function refreshDerivedCounters(): void {
  counters.dispatchRatePerMin = computeDispatchRatePerMin(recentDispatches);
  counters.failRate = computeFailRate(counters);
}

async function ensureOpsDir(): Promise<void> {
  await mkdir(OPS_DIR, { recursive: true });
}

async function loadHistoryFromDisk(): Promise<void> {
  if (loaded) return;

  try {
    const raw = await readFile(HISTORY_FILE, "utf8");
    const doc = JSON.parse(raw) as OpsHistoryDocument;
    counters = { ...defaultCounters, ...doc.counters };
    recentDispatches = doc.recentDispatches ?? [];
    logs = doc.logs ?? [];
    historyUpdatedAt = doc.updatedAt ?? null;
    refreshDerivedCounters();
  } catch {
    // fresh store
  }

  loaded = true;
}

async function persistHistory(): Promise<void> {
  await ensureOpsDir();
  refreshDerivedCounters();

  const doc: OpsHistoryDocument = {
    updatedAt: new Date().toISOString(),
    counters,
    recentDispatches,
    logs,
  };

  await writeFile(HISTORY_FILE, JSON.stringify(doc, null, 2), "utf8");
  historyUpdatedAt = doc.updatedAt;
}

function schedulePersist(): void {
  if (persistPromise) return;

  persistPromise = persistHistory()
    .catch(() => undefined)
    .finally(() => {
      persistPromise = null;
    });
}

function incrementCounter(event: OpsEventType): void {
  switch (event) {
    case "queued":
      counters.totalQueued += 1;
      break;
    case "dispatched":
      counters.totalDispatched += 1;
      counters.sendSuccess += 1;
      break;
    case "sandbox_dispatch":
      counters.sandboxDispatches += 1;
      counters.sendSuccess += 1;
      counters.totalDispatched += 1;
      break;
    case "skipped_duplicate":
      counters.duplicateSkips += 1;
      break;
    case "cooldown_blocked":
      counters.cooldownBlocked += 1;
      break;
    case "failed":
      counters.sendFailed += 1;
      break;
  }
}

/**
 * Records an operational event and appends to in-memory history + disk.
 */
export async function recordOpsEvent(input: RecordOpsEventInput): Promise<void> {
  await loadHistoryFromDisk();

  incrementCounter(input.event);

  const dispatchRecord: OpsDispatchRecord = {
    signalId: input.signalId,
    modelId: input.modelId,
    source: input.source,
    matchId: input.matchId,
    market: input.market,
    timestamp: new Date().toISOString(),
    status: input.status,
    latencyMs: input.latencyMs,
    error: input.error,
  };

  if (
    input.event !== "skipped_duplicate" &&
    input.event !== "cooldown_blocked"
  ) {
    recentDispatches = [dispatchRecord, ...recentDispatches].slice(
      0,
      MAX_DISPATCHES
    );
  } else {
    recentDispatches = [
      { ...dispatchRecord, status: input.status },
      ...recentDispatches,
    ].slice(0, MAX_DISPATCHES);
  }

  const logEntry: OpsLogEntry = {
    id: generateLogId(),
    timestamp: new Date().toISOString(),
    level: input.level ?? (input.event === "failed" ? "error" : "info"),
    event: input.event,
    message: input.message,
  };

  logs = [logEntry, ...logs].slice(0, MAX_LOGS);
  refreshDerivedCounters();
  schedulePersist();
}

export interface OpsStoreSnapshot {
  counters: OpsCounterMetrics;
  recentDispatches: OpsDispatchRecord[];
  logs: OpsLogEntry[];
  historyUpdatedAt: string | null;
}

export async function getOpsStoreSnapshot(): Promise<OpsStoreSnapshot> {
  await loadHistoryFromDisk();
  refreshDerivedCounters();

  return {
    counters: { ...counters },
    recentDispatches: [...recentDispatches],
    logs: [...logs],
    historyUpdatedAt,
  };
}
