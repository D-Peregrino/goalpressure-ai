import { getCommandConfig } from "@/lib/command/commandConfig";
import type { CommandExecuteContext, CommandItem, CommandPresetId } from "@/lib/command/command.types";

function applyTerminalCommand(filter: string, search?: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    getCommandConfig().terminalCommandKey,
    JSON.stringify({ filter, search, at: Date.now() })
  );
}

function applyOpsCommand(opts: { broadcast?: boolean; view?: 1 | 2 | 4 }): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    getCommandConfig().opsCommandKey,
    JSON.stringify({ ...opts, at: Date.now() })
  );
}

function applyPreset(preset: CommandPresetId): string {
  switch (preset) {
    case "trader":
      applyTerminalCommand("execute");
      return "/terminal";
    case "radar":
      applyOpsCommand({ view: 1 });
      return "/ops";
    case "tv":
      applyOpsCommand({ broadcast: true, view: 4 });
      return "/ops";
    case "quant":
      return "/analytics";
    default:
      return "/terminal";
  }
}

export async function executeCommand(
  item: CommandItem,
  ctx: CommandExecuteContext
): Promise<void> {
  const { action } = item;

  switch (action.type) {
    case "navigate":
      ctx.router.push(action.href);
      break;
    case "preset": {
      const href = applyPreset(action.preset);
      ctx.router.push(href);
      break;
    }
    case "terminal-filter":
      applyTerminalCommand(action.filter, action.search);
      ctx.router.push("/terminal");
      break;
    case "ops":
      applyOpsCommand({ broadcast: action.broadcast, view: action.view });
      ctx.router.push("/ops");
      break;
    case "workspace": {
      if (action.op === "watchlist-add" && action.fixtureId && ctx.onWorkspace) {
        await ctx.onWorkspace.addWatchlist(action.fixtureId, action.matchLabel);
      } else if (action.op === "watchlist-remove" && action.fixtureId && ctx.onWorkspace) {
        await ctx.onWorkspace.removeWatchlist(action.fixtureId);
      } else if (action.op === "favorite-toggle" && action.fixtureId && ctx.onWorkspace) {
        ctx.onWorkspace.toggleFavorite(action.fixtureId, action.matchLabel);
      } else if (action.op === "mute-league" && action.leagueName) {
        muteLeague(action.leagueName);
      }
      break;
    }
    default:
      break;
  }

  ctx.logAction(item);

  try {
    await fetch("/api/command/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commandId: item.id, title: item.title, action }),
    });
  } catch {
    /* non-blocking */
  }
}

export function muteLeague(leagueName: string): void {
  if (typeof window === "undefined") return;
  const key = getCommandConfig().storageMutedLeagues;
  try {
    const raw = localStorage.getItem(key);
    const list: string[] = raw ? (JSON.parse(raw) as string[]) : [];
    if (!list.includes(leagueName)) list.push(leagueName);
    localStorage.setItem(key, JSON.stringify(list.slice(-32)));
  } catch {
    /* ignore */
  }
}

export function isLeagueMuted(leagueName: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(getCommandConfig().storageMutedLeagues);
    const list: string[] = raw ? (JSON.parse(raw) as string[]) : [];
    return list.includes(leagueName);
  } catch {
    return false;
  }
}
