/**
 * Fixtures de demonstração na landing — escudos via CDN SportMonks (somente UI).
 */

export interface DemoTeam {
  name: string;
  short: string;
  logoPath: string;
}

export interface DemoMatch {
  id: string;
  home: DemoTeam;
  away: DemoTeam;
  scoreHome: number;
  scoreAway: number;
  minute: number;
  gpi: number;
  narrative: string;
  heat: number;
  /** Série de pressão (0–100) para mini chart */
  pressureSeries: { t: string; v: number }[];
}

function series(values: number[]): { t: string; v: number }[] {
  return values.map((v, i) => ({ t: `${i + 1}`, v }));
}

export const DEMO_MATCHES: DemoMatch[] = [
  {
    id: "liv-mci",
    home: { name: "Liverpool", short: "LIV", logoPath: "/images/soccer/teams/8/8.png" },
    away: { name: "Man City", short: "MCI", logoPath: "/images/soccer/teams/9/9.png" },
    scoreHome: 2,
    scoreAway: 1,
    minute: 67,
    gpi: 78,
    narrative: "Alta pressão no terço final",
    heat: 78,
    pressureSeries: series([38, 44, 48, 52, 58, 64, 70, 74, 76, 78]),
  },
  {
    id: "bar-atm",
    home: { name: "Barcelona", short: "BAR", logoPath: "/images/soccer/teams/83/83.png" },
    away: { name: "Atlético", short: "ATM", logoPath: "/images/soccer/teams/7980/7980.png" },
    scoreHome: 2,
    scoreAway: 1,
    minute: 54,
    gpi: 84,
    narrative: "Ritmo acelerando · mercado em movimento",
    heat: 84,
    pressureSeries: series([52, 58, 61, 68, 72, 78, 80, 82, 84, 84]),
  },
  {
    id: "ars-che",
    home: { name: "Arsenal", short: "ARS", logoPath: "/images/soccer/teams/19/19.png" },
    away: { name: "Chelsea", short: "CHE", logoPath: "/images/soccer/teams/18/18.png" },
    scoreHome: 1,
    scoreAway: 0,
    minute: 38,
    gpi: 62,
    narrative: "Pressão moderada · janela tática",
    heat: 62,
    pressureSeries: series([45, 48, 50, 52, 55, 58, 60, 61, 62, 62]),
  },
  {
    id: "int-mil",
    home: { name: "Inter", short: "INT", logoPath: "/images/soccer/teams/2930/2930.png" },
    away: { name: "Milan", short: "MIL", logoPath: "/images/soccer/teams/2934/2934.png" },
    scoreHome: 0,
    scoreAway: 0,
    minute: 22,
    gpi: 41,
    narrative: "Fase de estudo · baixa urgência",
    heat: 41,
    pressureSeries: series([32, 34, 36, 38, 39, 40, 41, 41, 40, 41]),
  },
];

export const DEMO_HERO_MATCH = DEMO_MATCHES[0]!;
