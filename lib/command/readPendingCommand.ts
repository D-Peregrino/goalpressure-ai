import { getCommandConfig } from "@/lib/command/commandConfig";

export interface PendingTerminalCommand {
  filter?: string;
  search?: string;
}

export interface PendingOpsCommand {
  broadcast?: boolean;
  view?: 1 | 2 | 4;
}

export function consumeTerminalCommand(): PendingTerminalCommand | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(getCommandConfig().terminalCommandKey);
    if (!raw) return null;
    sessionStorage.removeItem(getCommandConfig().terminalCommandKey);
    return JSON.parse(raw) as PendingTerminalCommand;
  } catch {
    return null;
  }
}

export function consumeOpsCommand(): PendingOpsCommand | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(getCommandConfig().opsCommandKey);
    if (!raw) return null;
    sessionStorage.removeItem(getCommandConfig().opsCommandKey);
    return JSON.parse(raw) as PendingOpsCommand;
  } catch {
    return null;
  }
}
