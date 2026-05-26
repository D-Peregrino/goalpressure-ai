import type { TelegramMessageKind, TelegramVisualLevel } from "@/lib/execution/telegramTemplates";

export interface TelegramMessageLogEntry {
  id: string;
  kind: TelegramMessageKind | "contextual_reading";
  level: TelegramVisualLevel;
  fixtureId: string | null;
  matchLabel: string | null;
  preview: string;
  fullText: string;
  sentAt: string;
  sandbox: boolean;
  delivered: boolean;
}

const MAX_LOG = 120;
const log: TelegramMessageLogEntry[] = [];

/** Últimas mensagens formatadas (histórico operacional). */
export function getTelegramMessageHistory(limit = 40): TelegramMessageLogEntry[] {
  return log.slice(0, limit);
}

export function appendTelegramMessageLog(entry: Omit<TelegramMessageLogEntry, "id">): TelegramMessageLogEntry {
  const row: TelegramMessageLogEntry = {
    ...entry,
    id: `tg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };
  log.unshift(row);
  if (log.length > MAX_LOG) log.length = MAX_LOG;
  return row;
}

/** Pré-visualização sandbox (última mensagem ou amostra). */
export function getTelegramSandboxPreview(): TelegramMessageLogEntry | null {
  const sandbox = log.find((e) => e.sandbox);
  return sandbox ?? log[0] ?? null;
}

export function clearTelegramSandboxLog(): void {
  for (let i = log.length - 1; i >= 0; i--) {
    if (log[i]?.sandbox) log.splice(i, 1);
  }
}
