import { getCommandConfig } from "@/lib/command/commandConfig";
import type { CommandItem } from "@/lib/command/command.types";

export function loadCommandHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getCommandConfig().storageHistory);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function pushCommandHistory(item: CommandItem): void {
  if (typeof window === "undefined") return;
  const key = getCommandConfig().storageHistory;
  const prev = loadCommandHistory().filter((id) => id !== item.id);
  const next = [item.id, ...prev].slice(0, getCommandConfig().historyMax);
  try {
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function historyItems(all: CommandItem[]): CommandItem[] {
  const ids = loadCommandHistory();
  const map = new Map(all.map((c) => [c.id, c]));
  return ids.map((id) => map.get(id)).filter((c): c is CommandItem => Boolean(c));
}
