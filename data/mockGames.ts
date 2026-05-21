import type { Match } from "@/types/domain";
import { applyPressureToMatch } from "@/lib/pressureScore";

const mockSeeds: Omit<Match, "pressure">[] = [
  {
    id: "gp-001",
    league: "Brasileirão",
    homeTeam: "Flamengo",
    awayTeam: "Vasco",
    minute: 67,
    stats: { shots: 18, shotsOnTarget: 9, dangerousAttacks: 41, corners: 7 },
    odds: { primary: 1.74, over05: 1.74, over15: 2.05 },
    score: { home: 1, away: 0 },
    status: "LIVE",
  },
  {
    id: "gp-002",
    league: "Premier League",
    homeTeam: "Manchester City",
    awayTeam: "Arsenal",
    minute: 52,
    stats: { shots: 14, shotsOnTarget: 6, dangerousAttacks: 33, corners: 5 },
    odds: { primary: 2.1, over05: 1.62, over15: 2.1 },
    score: { home: 1, away: 1 },
    status: "LIVE",
  },
  {
    id: "gp-003",
    league: "La Liga",
    homeTeam: "Barcelona",
    awayTeam: "Real Madrid",
    minute: 38,
    stats: { shots: 11, shotsOnTarget: 4, dangerousAttacks: 27, corners: 4 },
    odds: { primary: 1.85, over05: 1.58, over15: 2.2 },
    score: { home: 0, away: 0 },
    status: "LIVE",
  },
  {
    id: "gp-004",
    league: "Serie A",
    homeTeam: "Inter",
    awayTeam: "Milan",
    minute: 74,
    stats: { shots: 21, shotsOnTarget: 11, dangerousAttacks: 46, corners: 8 },
    odds: { primary: 2.35, over05: 1.52, over15: 1.88 },
    score: { home: 2, away: 1 },
    status: "LIVE",
  },
  {
    id: "gp-005",
    league: "Bundesliga",
    homeTeam: "Bayern Munich",
    awayTeam: "Dortmund",
    minute: 29,
    stats: { shots: 8, shotsOnTarget: 3, dangerousAttacks: 19, corners: 3 },
    odds: { primary: 1.92, over05: 1.45, over15: 1.95 },
    score: { home: 0, away: 1 },
    status: "LIVE",
  },
  {
    id: "gp-006",
    league: "Ligue 1",
    homeTeam: "PSG",
    awayTeam: "Marseille",
    minute: 61,
    stats: { shots: 16, shotsOnTarget: 7, dangerousAttacks: 36, corners: 6 },
    odds: { primary: 1.68, over05: 1.55, over15: 1.68 },
    score: { home: 1, away: 0 },
    status: "LIVE",
  },
  {
    id: "gp-007",
    league: "Champions League",
    homeTeam: "Liverpool",
    awayTeam: "Atlético Madrid",
    minute: 83,
    stats: { shots: 24, shotsOnTarget: 12, dangerousAttacks: 52, corners: 9 },
    odds: { primary: 1.55, over05: 1.55, over15: 1.82 },
    score: { home: 2, away: 1 },
    status: "LIVE",
  },
];

/** Mock fixtures with V1 pressure score derived from stats (not hardcoded). */
export const mockGames: Match[] = mockSeeds.map((seed) =>
  applyPressureToMatch({
    ...seed,
    pressure: { score: 0 },
  })
);
