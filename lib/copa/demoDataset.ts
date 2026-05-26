import type { CopaDataset } from "@/lib/copa/types";

const TEAMS = [
  { id: "br", name: "Brasil", shortCode: "BRA", group: "A" },
  { id: "ar", name: "Argentina", shortCode: "ARG", group: "A" },
  { id: "de", name: "Alemanha", shortCode: "GER", group: "A" },
  { id: "jp", name: "Japão", shortCode: "JPN", group: "A" },
  { id: "fr", name: "França", shortCode: "FRA", group: "B" },
  { id: "es", name: "Espanha", shortCode: "ESP", group: "B" },
  { id: "us", name: "Estados Unidos", shortCode: "USA", group: "B" },
  { id: "mx", name: "México", shortCode: "MEX", group: "B" },
];

export function buildCopaDemoDataset(): CopaDataset {
  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);

  const today = [
    {
      fixtureId: "wc-demo-1",
      matchId: "sm-wc-demo-1",
      kickoffAt: now.toISOString(),
      kickoffLabel: "16:00",
      home: TEAMS[0]!,
      away: TEAMS[1]!,
      homeScore: 1,
      awayScore: 1,
      minute: 67,
      status: "live" as const,
      stage: "Fase de grupos",
      group: "A",
      venue: "Los Angeles",
      isLive: true,
    },
    {
      fixtureId: "wc-demo-2",
      matchId: "sm-wc-demo-2",
      kickoffAt: new Date(now.getTime() + 3 * 3600_000).toISOString(),
      kickoffLabel: "19:00",
      home: TEAMS[4]!,
      away: TEAMS[5]!,
      homeScore: null,
      awayScore: null,
      minute: null,
      status: "scheduled" as const,
      stage: "Fase de grupos",
      group: "B",
      venue: "Nova York",
      isLive: false,
    },
  ];

  const groups = ["A", "B"].map((g) => ({
    group: g,
    teams: TEAMS.filter((t) => t.group === g),
  }));

  const standings = TEAMS.map((t, i) => ({
    group: t.group!,
    team: t,
    played: 2,
    won: i % 3 === 0 ? 1 : 0,
    drawn: i % 3 === 1 ? 1 : 0,
    lost: i % 3 === 2 ? 1 : 0,
    goalsFor: 3 - (i % 2),
    goalsAgainst: 1 + (i % 2),
    goalDiff: 2 - (i % 2),
    points: 4 - (i % 2),
  }));

  return {
    generatedAt: now.toISOString(),
    source: "demo",
    leagueId: 732,
    overview: {
      totalMatches: 104,
      liveNow: 1,
      todayCount: today.length,
      teamsCount: TEAMS.length,
      nextKickoff: today[1]?.kickoffAt ?? null,
      headline: "Modo demonstração — conecte SportMonks para dados reais da Copa.",
    },
    today,
    calendar: [
      { date: todayIso, label: "Hoje", matches: today },
      {
        date: "2026-06-15",
        label: "15 Jun",
        matches: [],
      },
    ],
    groups,
    standings,
    teams: TEAMS,
    stats: {
      leaders: [
        { label: "Artilheiro (demo)", value: "2 gols", team: "Brasil" },
        { label: "Pressão média", value: "68", team: "Argentina" },
      ],
      totals: { goals: 12, matchesPlayed: 8, avgGoals: 1.5 },
    },
    liveFixtureIds: ["wc-demo-1"],
  };
}
