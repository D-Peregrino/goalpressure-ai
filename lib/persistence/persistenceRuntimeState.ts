import type { PersistenceFailureRecord } from "@/lib/persistence/persistenceObservability.types";

const MAX_FAILURES = 24;

const failures: PersistenceFailureRecord[] = [];
const lastWriteByTable = new Map<string, string>();
let failureCountSession = 0;
let insertsLastMinute = 0;
const insertTimestamps: number[] = [];

export function recordPersistenceFailure(params: {
  table: string;
  message: string;
  scope?: string;
}): void {
  failureCountSession += 1;
  failures.unshift({
    at: new Date().toISOString(),
    table: params.table,
    message: params.message.slice(0, 280),
    scope: params.scope ?? "batch",
  });
  if (failures.length > MAX_FAILURES) failures.length = MAX_FAILURES;
}

export function recordPersistenceSuccess(table: string, rows: number): void {
  if (rows <= 0) return;
  lastWriteByTable.set(table, new Date().toISOString());
  const now = Date.now();
  for (let i = 0; i < rows; i += 1) insertTimestamps.push(now);
  pruneInsertTimestamps();
}

function pruneInsertTimestamps(): void {
  const cutoff = Date.now() - 60_000;
  while (insertTimestamps.length > 0 && insertTimestamps[0]! < cutoff) {
    insertTimestamps.shift();
  }
  insertsLastMinute = insertTimestamps.length;
}

export function getInsertsPerMinute(): number {
  pruneInsertTimestamps();
  return insertsLastMinute;
}

export function getRecentFailures(): PersistenceFailureRecord[] {
  return [...failures];
}

export function getFailureCountSession(): number {
  return failureCountSession;
}

export function getLastWriteAt(): string | null {
  const times = [...lastWriteByTable.values()];
  if (times.length === 0) return null;
  return times.sort().reverse()[0] ?? null;
}

export function getLastWriteByTable(table: string): string | null {
  return lastWriteByTable.get(table) ?? null;
}
