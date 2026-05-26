"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useUserWorkspace } from "@/contexts/UserWorkspaceContext";
import { useOperationalWorkspace } from "@/hooks/useOperationalWorkspace";
import { executeCommand } from "@/lib/command/commandActions";
import { historyItems, pushCommandHistory } from "@/lib/command/commandHistory";
import { parseAndRankCommands } from "@/lib/command/commandParser";
import {
  getQuickActionCommands,
  getStaticCommands,
} from "@/lib/command/commandRegistry";
import { buildWorkspaceSuggestions } from "@/lib/command/commandSuggestions";
import {
  gpiToSearchItems,
  matchesToSearchItems,
} from "@/lib/command/buildSearchIndex";
import { isCommandSystemEnabled } from "@/lib/command/commandConfig";
import type { CommandItem } from "@/lib/command/command.types";
import CommandPalette from "@/components/command/CommandPalette";

interface CommandContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  query: string;
  setQuery: (q: string) => void;
  results: CommandItem[];
  execute: (item: CommandItem) => void;
  loading: boolean;
}

const CommandContext = createContext<CommandContextValue | null>(null);

export function useCommandPalette() {
  const ctx = useContext(CommandContext);
  if (!ctx) {
    throw new Error("useCommandPalette must be used within CommandProvider");
  }
  return ctx;
}

export function CommandProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const ws = useUserWorkspace();
  const op = useOperationalWorkspace();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [dynamicItems, setDynamicItems] = useState<CommandItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadDynamicIndex = useCallback(async () => {
    setLoading(true);
    try {
      const [liveRes, gpiRes] = await Promise.all([
        fetch("/api/live-matches"),
        fetch("/api/gpi/live"),
      ]);

      const items: CommandItem[] = [];

      if (liveRes.ok) {
        const live = (await liveRes.json()) as { matches?: import("@/types/domain").Match[] };
        if (live.matches?.length) {
          items.push(...matchesToSearchItems(live.matches));
        }
      }

      if (gpiRes.ok) {
        const gpi = (await gpiRes.json()) as {
          snapshot?: { readings?: { fixtureId: string; matchLabel: string; score: number; league: string }[] };
        };
        if (gpi.snapshot?.readings?.length) {
          items.push(...gpiToSearchItems(gpi.snapshot.readings));
        }
      }

      setDynamicItems(items);
    } catch {
      setDynamicItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isCommandSystemEnabled()) return;

    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) void loadDynamicIndex();
  }, [open, loadDynamicIndex]);

  const allItems = useMemo(() => {
    const suggestions = buildWorkspaceSuggestions({
      watchlist: op.operational.watchlist,
      favoriteTeams: op.operational.favoriteTeams,
      favoriteLeagues: op.operational.favoriteLeagues,
      recentAlerts: op.operational.alertHistory
        .filter((a) => a.fixtureId)
        .map((a) => ({
          fixtureId: a.fixtureId!,
          label: a.matchLabel ?? "Alerta",
          message: a.message,
        })),
      favoriteFixtureIds: [...ws.favorites],
    });

    return [
      ...getStaticCommands(),
      ...getQuickActionCommands(),
      ...suggestions,
      ...dynamicItems,
    ];
  }, [dynamicItems, op.operational, ws.favorites]);

  const results = useMemo(() => {
    if (!query.trim()) {
      const recent = historyItems(allItems);
      const rest = allItems.filter((i) => !recent.some((r) => r.id === i.id));
      return [...recent, ...rest].slice(0, 40);
    }
    return parseAndRankCommands(allItems, query).slice(0, 40);
  }, [allItems, query]);

  const execute = useCallback(
    (item: CommandItem) => {
      pushCommandHistory(item);
      setOpen(false);
      setQuery("");
      void executeCommand(item, {
        router,
        onWorkspace: {
          addWatchlist: op.addWatchlist,
          removeWatchlist: op.removeWatchlist,
          toggleFavorite: (fixtureId, label) => ws.toggleFavorite(fixtureId, label),
        },
        logAction: () => {},
      });
    },
    [router, op.addWatchlist, op.removeWatchlist, ws.toggleFavorite]
  );

  if (!isCommandSystemEnabled()) {
    return <>{children}</>;
  }

  return (
    <CommandContext.Provider
      value={{ open, setOpen, query, setQuery, results, execute, loading }}
    >
      {children}
      <CommandPalette />
    </CommandContext.Provider>
  );
}
