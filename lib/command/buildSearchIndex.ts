import type { CommandItem } from "@/lib/command/command.types";
import { matchListLabel } from "@/lib/ux/hotMatches";
import type { Match } from "@/types/domain";

export function matchesToSearchItems(matches: Match[]): CommandItem[] {
  const items: CommandItem[] = [];

  for (const m of matches) {
    const fid = String(m.externalId ?? m.id);
    const label = matchListLabel(m);
    const pressure = Math.round(m.pressure.score);

    items.push({
      id: `match-${fid}`,
      title: label,
      subtitle: `${m.league} · Pressão ${pressure}${m.minute ? ` · ${m.minute}'` : ""}`,
      keywords: [m.homeTeam, m.awayTeam, m.league, label, fid, "jogo", "match"],
      group: "Jogos",
      kind: "search",
      score: pressure >= 70 ? 15 : 5,
      action: { type: "navigate", href: `/match/${encodeURIComponent(fid)}` },
    });

    items.push({
      id: `match-watch-${fid}`,
      title: `Adicionar à watchlist · ${label}`,
      subtitle: m.league,
      keywords: [label, "watchlist", "monitorar"],
      group: "Ações rápidas",
      kind: "action",
      action: {
        type: "workspace",
        op: "watchlist-add",
        fixtureId: fid,
        matchLabel: label,
      },
    });

    items.push({
      id: `match-fav-${fid}`,
      title: `Favoritar · ${label}`,
      subtitle: m.league,
      keywords: [label, "favorito", "star"],
      group: "Ações rápidas",
      kind: "action",
      action: {
        type: "workspace",
        op: "favorite-toggle",
        fixtureId: fid,
        matchLabel: label,
      },
    });
  }

  const leagues = new Map<string, number>();
  for (const m of matches) {
    leagues.set(m.league, (leagues.get(m.league) ?? 0) + 1);
  }

  for (const [league, count] of leagues) {
    items.push({
      id: `league-${league}`,
      title: league,
      subtitle: `${count} jogos ao vivo`,
      keywords: [league, "liga", "league"],
      group: "Ligas",
      kind: "search",
      action: { type: "terminal-filter", filter: "all", search: league },
    });
    items.push({
      id: `league-mute-${league}`,
      title: `Silenciar liga · ${league}`,
      subtitle: "Ocultar alertas locais",
      keywords: [league, "silenciar", "mute"],
      group: "Ações rápidas",
      kind: "action",
      action: { type: "workspace", op: "mute-league", leagueName: league },
    });
  }

  const teams = new Set<string>();
  for (const m of matches) {
    teams.add(m.homeTeam);
    teams.add(m.awayTeam);
  }

  for (const team of teams) {
    items.push({
      id: `team-${team}`,
      title: team,
      subtitle: "Buscar no terminal",
      keywords: [team, "time", "clube"],
      group: "Times",
      kind: "search",
      action: { type: "terminal-filter", filter: "all", search: team },
    });
  }

  return items;
}

export function gpiToSearchItems(
  readings: { fixtureId: string; matchLabel: string; score: number; league: string }[]
): CommandItem[] {
  return readings
    .filter((r) => r.score >= 70)
    .map((r) => ({
      id: `gpi-${r.fixtureId}`,
      title: `GPI ${r.score} · ${r.matchLabel}`,
      subtitle: r.league,
      keywords: [r.matchLabel, "gpi", String(r.score), r.league],
      group: "GPI",
      kind: "search",
      score: r.score >= 85 ? 25 : 12,
      action: { type: "navigate", href: `/match/${encodeURIComponent(r.fixtureId)}` },
    }));
}
