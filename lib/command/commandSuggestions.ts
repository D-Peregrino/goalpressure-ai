import type { CommandItem } from "@/lib/command/command.types";

export interface WorkspaceSuggestionInput {
  watchlist: { fixtureId: string; matchLabel: string | null }[];
  favoriteTeams: { teamName: string; leagueName: string | null }[];
  favoriteLeagues: { leagueName: string }[];
  recentAlerts: { fixtureId: string; label: string; message: string }[];
  favoriteFixtureIds: string[];
}

/** Sugestões baseadas no workspace do usuário. */
export function buildWorkspaceSuggestions(input: WorkspaceSuggestionInput): CommandItem[] {
  const items: CommandItem[] = [];

  for (const w of input.watchlist.slice(0, 6)) {
    items.push({
      id: `sug-watch-${w.fixtureId}`,
      title: w.matchLabel ?? `Jogo ${w.fixtureId}`,
      subtitle: "Watchlist · abrir partida",
      keywords: [w.matchLabel ?? "", "watchlist", w.fixtureId],
      group: "Sugestões",
      kind: "search",
      score: 40,
      action: { type: "navigate", href: `/match/${encodeURIComponent(w.fixtureId)}` },
    });
  }

  for (const t of input.favoriteTeams.slice(0, 4)) {
    items.push({
      id: `sug-team-${t.teamName}`,
      title: t.teamName,
      subtitle: t.leagueName ?? "Time favorito",
      keywords: [t.teamName, t.leagueName ?? "", "time"],
      group: "Sugestões",
      kind: "search",
      score: 35,
      action: { type: "terminal-filter", filter: "all", search: t.teamName },
    });
  }

  for (const l of input.favoriteLeagues.slice(0, 4)) {
    items.push({
      id: `sug-league-${l.leagueName}`,
      title: l.leagueName,
      subtitle: "Liga favorita",
      keywords: [l.leagueName, "liga"],
      group: "Sugestões",
      kind: "search",
      score: 30,
      action: { type: "terminal-filter", filter: "all", search: l.leagueName },
    });
  }

  for (const a of input.recentAlerts.slice(0, 4)) {
    items.push({
      id: `sug-alert-${a.fixtureId}`,
      title: a.label,
      subtitle: a.message,
      keywords: [a.label, a.message, "alerta"],
      group: "Sugestões",
      kind: "search",
      score: 28,
      action: { type: "navigate", href: `/match/${encodeURIComponent(a.fixtureId)}` },
    });
  }

  return items;
}
