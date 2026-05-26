export type CommandKind = "navigation" | "filter" | "action" | "preset" | "search";

export type CommandPresetId = "trader" | "radar" | "tv" | "quant";

export type CommandAction =
  | { type: "navigate"; href: string }
  | { type: "preset"; preset: CommandPresetId }
  | { type: "terminal-filter"; filter: string; search?: string }
  | { type: "ops"; broadcast?: boolean; view?: 1 | 2 | 4 }
  | {
      type: "workspace";
      op: "watchlist-add" | "watchlist-remove" | "favorite-toggle" | "mute-league";
      fixtureId?: string;
      matchLabel?: string;
      leagueName?: string;
    };

export interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  keywords: string[];
  group: string;
  kind: CommandKind;
  action: CommandAction;
  score?: number;
}

export interface CommandSearchIndex {
  matches: CommandItem[];
  leagues: CommandItem[];
  teams: CommandItem[];
  alerts: CommandItem[];
  contexts: CommandItem[];
}

export interface CommandExecuteContext {
  router: { push: (href: string) => void };
  onWorkspace?: {
    addWatchlist: (fixtureId: string, label?: string) => Promise<boolean>;
    removeWatchlist: (fixtureId: string) => Promise<boolean>;
    toggleFavorite: (fixtureId: string, label?: string) => void;
  };
  logAction: (item: CommandItem) => void;
}
