import { COPA_LEAGUE_ID } from "@/lib/copa/config";
import { buildCopaDemoDataset } from "@/lib/copa/demoDataset";
import { mapSportmonksFixtureToCopaMatch } from "@/lib/copa/mapCopaFixture";
import {
  fetchCopaFixturesByDate,
  fetchCopaFixturesWindow,
  fetchCopaInplayFixtures,
  mergeCopaFixtures,
} from "@/lib/copa/sportmonksCopa";
import type {
  CopaCalendarDay,
  CopaDataset,
  CopaGroupRow,
  CopaMatch,
  CopaStandingRow,
  CopaTeam,
} from "@/lib/copa/types";
import { isSportmonksTokenConfigured } from "@/lib/data-source/config";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDayLabel(date: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(`${date}T12:00:00Z`));
  } catch {
    return date;
  }
}

function buildCalendar(matches: CopaMatch[]): CopaCalendarDay[] {
  const byDate = new Map<string, CopaMatch[]>();
  for (const m of matches) {
    const d = m.kickoffAt.slice(0, 10);
    const list = byDate.get(d) ?? [];
    list.push(m);
    byDate.set(d, list);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayMatches]) => ({
      date,
      label: date === todayIso() ? "Hoje" : formatDayLabel(date),
      matches: dayMatches.sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt)),
    }));
}

function buildGroups(teams: CopaTeam[]): CopaGroupRow[] {
  const byGroup = new Map<string, CopaTeam[]>();
  for (const t of teams) {
    const g = t.group ?? "—";
    const list = byGroup.get(g) ?? [];
    if (!list.some((x) => x.id === t.id)) list.push(t);
    byGroup.set(g, list);
  }
  return [...byGroup.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, groupTeams]) => ({ group, teams: groupTeams }));
}

function buildStandings(matches: CopaMatch[], teams: CopaTeam[]): CopaStandingRow[] {
  const table = new Map<string, CopaStandingRow>();

  function ensure(team: CopaTeam, group: string): CopaStandingRow {
    const key = `${group}:${team.id}`;
    let row = table.get(key);
    if (!row) {
      row = {
        group,
        team,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDiff: 0,
        points: 0,
      };
      table.set(key, row);
    }
    return row;
  }

  for (const t of teams) {
    ensure(t, t.group ?? "—");
  }

  for (const m of matches) {
    if (m.status !== "finished") continue;
    if (m.homeScore == null || m.awayScore == null) continue;
    const group = m.group ?? m.home.group ?? "—";
    const home = ensure(m.home, group);
    const away = ensure(m.away, group);

    home.played += 1;
    away.played += 1;
    home.goalsFor += m.homeScore;
    home.goalsAgainst += m.awayScore;
    away.goalsFor += m.awayScore;
    away.goalsAgainst += m.homeScore;

    if (m.homeScore > m.awayScore) {
      home.won += 1;
      away.lost += 1;
      home.points += 3;
    } else if (m.homeScore < m.awayScore) {
      away.won += 1;
      home.lost += 1;
      away.points += 3;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  return [...table.values()]
    .map((r) => ({
      ...r,
      goalDiff: r.goalsFor - r.goalsAgainst,
    }))
    .sort((a, b) => {
      if (a.group !== b.group) return a.group.localeCompare(b.group);
      return b.points - a.points || b.goalDiff - a.goalDiff;
    });
}

function uniqueTeams(matches: CopaMatch[]): CopaTeam[] {
  const map = new Map<string, CopaTeam>();
  for (const m of matches) {
    map.set(m.home.id, m.home);
    map.set(m.away.id, m.away);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function buildCopaDataset(): Promise<CopaDataset> {
  if (!isSportmonksTokenConfigured()) {
    return buildCopaDemoDataset();
  }

  const today = todayIso();
  const [window, inplay, todayFixtures] = await Promise.all([
    fetchCopaFixturesWindow(),
    fetchCopaInplayFixtures(),
    fetchCopaFixturesByDate(today),
  ]);

  const merged = mergeCopaFixtures(window, inplay, todayFixtures);
  if (merged.length === 0) {
    const demo = buildCopaDemoDataset();
    return {
      ...demo,
      source: "demo",
      overview: {
        ...demo.overview,
        headline:
          "Sem fixtures SportMonks da Copa no momento — exibindo demonstração até a janela oficial.",
      },
    };
  }

  const matches = merged.map((f) =>
    mapSportmonksFixtureToCopaMatch(f, f.group_id != null ? `G${f.group_id}` : undefined)
  );
  const teams = uniqueTeams(matches);
  const calendar = buildCalendar(matches);
  const todayMatches = matches.filter((m) => m.kickoffAt.slice(0, 10) === today);
  const live = matches.filter((m) => m.isLive);
  const finished = matches.filter((m) => m.status === "finished");
  const totalGoals = finished.reduce(
    (acc, m) => acc + (m.homeScore ?? 0) + (m.awayScore ?? 0),
    0
  );
  const upcoming = matches
    .filter((m) => m.status === "scheduled")
    .sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt));

  return {
    generatedAt: new Date().toISOString(),
    source: "sportmonks",
    leagueId: COPA_LEAGUE_ID,
    overview: {
      totalMatches: matches.length,
      liveNow: live.length,
      todayCount: todayMatches.length,
      teamsCount: teams.length,
      nextKickoff: upcoming[0]?.kickoffAt ?? null,
      headline: `${live.length} ao vivo · ${todayMatches.length} hoje · ${teams.length} seleções`,
    },
    today: todayMatches.length ? todayMatches : matches.slice(0, 8),
    calendar,
    groups: buildGroups(teams),
    standings: buildStandings(matches, teams),
    teams,
    stats: {
      leaders: [
        {
          label: "Gols na amostra",
          value: String(totalGoals),
        },
        {
          label: "Média por jogo",
          value:
            finished.length > 0
              ? (totalGoals / finished.length).toFixed(2)
              : "—",
        },
      ],
      totals: {
        goals: totalGoals,
        matchesPlayed: finished.length,
        avgGoals: finished.length ? totalGoals / finished.length : 0,
      },
    },
    liveFixtureIds: live.map((m) => m.fixtureId),
  };
}
