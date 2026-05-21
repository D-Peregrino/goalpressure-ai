/**
 * Local JSON snapshot storage for historical match/signal data.
 * Server-side only — prepares future backtests without a database.
 */

import { mkdir, readdir, stat, unlink, writeFile } from "fs/promises";
import path from "path";
import type { LiveMatchesApiMeta } from "@/types/api";
import type { Match, Signal } from "@/types/domain";
import { logInfo, logWarn } from "@/lib/utils/logger";

const LOG_SCOPE = "snapshot-storage";
const RETENTION_MS = 24 * 60 * 60 * 1000;
const MIN_INTERVAL_MS = 30_000;
const SNAPSHOT_DIR = path.join(process.cwd(), "data", "snapshots");

export interface LiveSnapshot {
  timestamp: string;
  source: string;
  matchCount: number;
  signalCount: number;
  matches: Match[];
  signals: Signal[];
  meta: LiveMatchesApiMeta;
}

let lastSnapshotAt = 0;
let ensureDirPromise: Promise<void> | null = null;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function buildSnapshotFilename(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = pad2(date.getUTCMonth() + 1);
  const d = pad2(date.getUTCDate());
  const h = pad2(date.getUTCHours());
  const min = pad2(date.getUTCMinutes());
  return `snapshot-${y}-${m}-${d}-${h}-${min}.json`;
}

async function ensureSnapshotDir(): Promise<void> {
  if (!ensureDirPromise) {
    ensureDirPromise = mkdir(SNAPSHOT_DIR, { recursive: true }).then(() => undefined);
  }
  await ensureDirPromise;
}

function parseSnapshotTime(filename: string): number | null {
  const match = /^snapshot-(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})\.json$/.exec(
    filename
  );
  if (!match) return null;

  const [, y, mo, d, h, min] = match;
  return Date.UTC(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(min)
  );
}

async function pruneOldSnapshots(now = Date.now()): Promise<string[]> {
  await ensureSnapshotDir();

  let entries: string[];
  try {
    entries = await readdir(SNAPSHOT_DIR);
  } catch {
    return [];
  }

  const removed: string[] = [];

  for (const name of entries) {
    if (!name.startsWith("snapshot-") || !name.endsWith(".json")) continue;

    const filePath = path.join(SNAPSHOT_DIR, name);
    let fileTime = parseSnapshotTime(name);

    if (fileTime === null) {
      try {
        const fileStat = await stat(filePath);
        fileTime = fileStat.mtimeMs;
      } catch {
        continue;
      }
    }

    if (now - fileTime > RETENTION_MS) {
      try {
        await unlink(filePath);
        removed.push(name);
      } catch {
        // ignore per-file delete errors
      }
    }
  }

  return removed;
}

function shouldSkipSave(matchCount: number, signalCount: number): boolean {
  if (matchCount === 0 && signalCount === 0) return true;

  const now = Date.now();
  if (now - lastSnapshotAt < MIN_INTERVAL_MS) {
    logInfo(LOG_SCOPE, "Snapshot skipped — minimum interval not elapsed", {
      elapsedMs: now - lastSnapshotAt,
      minIntervalMs: MIN_INTERVAL_MS,
    });
    return true;
  }

  return false;
}

/**
 * Persists a live monitoring snapshot to data/snapshots/.
 * Enforces 30s minimum interval and 24h retention cleanup.
 */
export async function saveLiveSnapshot(
  matches: Match[],
  signals: Signal[],
  meta: LiveMatchesApiMeta
): Promise<string | null> {
  const matchCount = matches.length;
  const signalCount = signals.length;

  if (shouldSkipSave(matchCount, signalCount)) {
    return null;
  }

  await ensureSnapshotDir();

  const now = Date.now();
  const filename = buildSnapshotFilename(new Date(now));
  const filePath = path.join(SNAPSHOT_DIR, filename);

  const snapshot: LiveSnapshot = {
    timestamp: new Date(now).toISOString(),
    source: meta.source,
    matchCount,
    signalCount,
    matches,
    signals,
    meta,
  };

  const payload = JSON.stringify(snapshot, null, 2);
  await writeFile(filePath, payload, "utf8");

  lastSnapshotAt = now;

  const removed = await pruneOldSnapshots(now);
  const fileStat = await stat(filePath);

  logInfo(LOG_SCOPE, "Snapshot saved", {
    filename,
    matchCount,
    signalCount,
    fileSizeBytes: fileStat.size,
    snapshotsRemoved: removed.length,
    ...(removed.length > 0 ? { removedFiles: removed } : {}),
  });

  if (removed.length > 0) {
    logInfo(LOG_SCOPE, "Old snapshots pruned", {
      count: removed.length,
      retentionHours: RETENTION_MS / (60 * 60 * 1000),
    });
  }

  return filePath;
}

/**
 * Fire-and-forget wrapper — never blocks API responses.
 */
export function saveLiveSnapshotAsync(
  matches: Match[],
  signals: Signal[],
  meta: LiveMatchesApiMeta
): void {
  void saveLiveSnapshot(matches, signals, meta).catch((error) => {
    const message = error instanceof Error ? error.message : "Unknown error";
    logWarn(LOG_SCOPE, "Snapshot save failed", { message });
  });
}
