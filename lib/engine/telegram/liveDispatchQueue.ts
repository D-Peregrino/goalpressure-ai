/**
 * Live dispatch queue — formats Telegram payloads, enqueues, logs ops.
 * Does NOT perform real Telegram delivery (sandbox / queue-only).
 */

import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { Signal } from "@/types/domain";
import type { MatchEngineInsight } from "@/types/engine";
import { recordOpsEvent } from "@/lib/ops/opsStore";
import { formatSignalForTelegram } from "@/lib/telegram/signalFormatter";
import type { TelegramFormattedMessage } from "@/types/telegram";
import { logInfo } from "@/lib/utils/logger";

const LOG_SCOPE = "live-dispatch-queue";
const QUEUE_DIR = path.join(process.cwd(), "data", "ops");
const QUEUE_FILE = path.join(QUEUE_DIR, "dispatch-queue.json");
const MAX_QUEUE = 50;

interface DispatchQueueDocument {
  updatedAt: string;
  items: TelegramFormattedMessage[];
}

const memoryQueue: TelegramFormattedMessage[] = [];
let persistPromise: Promise<void> | null = null;

async function persistQueue(): Promise<void> {
  await mkdir(QUEUE_DIR, { recursive: true });
  const doc: DispatchQueueDocument = {
    updatedAt: new Date().toISOString(),
    items: memoryQueue.slice(0, MAX_QUEUE),
  };
  await writeFile(QUEUE_FILE, JSON.stringify(doc, null, 2), "utf8");
}

function schedulePersist(): void {
  if (!persistPromise) {
    persistPromise = persistQueue().finally(() => {
      persistPromise = null;
    });
  }
}

export function getLiveDispatchQueueSize(): number {
  return memoryQueue.length;
}

export function getLiveDispatchQueueSnapshot(): TelegramFormattedMessage[] {
  return [...memoryQueue];
}

/**
 * Enqueue formatted payloads and register ops logs — no network send.
 */
export function enqueueLiveDispatchBatch(
  signals: Signal[],
  modelId: string,
  insights: MatchEngineInsight[]
): number {
  const insightByMatch = new Map(insights.map((i) => [i.matchId, i]));
  let queued = 0;

  for (const signal of signals) {
    const insight = insightByMatch.get(signal.matchId);
    const formatted = formatSignalForTelegram({
      signal,
      modelId,
      source: "production",
      minute: insight?.minute ?? undefined,
    });

    const duplicate = memoryQueue.some(
      (q) => q.fingerprint === formatted.fingerprint
    );
    if (duplicate) continue;

    memoryQueue.unshift(formatted);
    if (memoryQueue.length > MAX_QUEUE) {
      memoryQueue.length = MAX_QUEUE;
    }

    void recordOpsEvent({
      event: "queued",
      signalId: formatted.signalId,
      modelId,
      source: "production",
      matchId: formatted.matchId,
      market: formatted.market,
      status: "queued",
      message: `Live queue (no send): ${formatted.signalId}`,
    });

    queued += 1;
  }

  if (queued > 0) {
    schedulePersist();
    logInfo(LOG_SCOPE, "Dispatch queue updated", {
      queued,
      queueSize: memoryQueue.length,
    });
  }

  return memoryQueue.length;
}

export async function loadDispatchQueueFromDisk(): Promise<void> {
  try {
    const raw = await readFile(QUEUE_FILE, "utf8");
    const doc = JSON.parse(raw) as DispatchQueueDocument;
    memoryQueue.length = 0;
    memoryQueue.push(...(doc.items ?? []).slice(0, MAX_QUEUE));
  } catch {
    // file optional
  }
}
