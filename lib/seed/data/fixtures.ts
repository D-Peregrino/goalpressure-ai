export type SeedMatchTemplate = {
  key: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  status: "LIVE" | "NOT_STARTED" | "HALFTIME" | "FINISHED";
  minute: number;
  score: { home: number; away: number };
  pressureScore: number;
  stats: {
    shots: number;
    shotsOnTarget: number;
    dangerousAttacks: number;
    corners: number;
    xG: number;
    possession: number;
    yellowCards: number;
    redCards: number;
  };
  odds: {
    primary: number;
    over05: number;
    over15: number;
    over25: number;
    bttsYes: number;
  };
};

export const SEED_MATCH_TEMPLATES: SeedMatchTemplate[] = [
  {
    key: "fla-vas",
    league: "Brasileirão Série A",
    homeTeam: "Flamengo",
    awayTeam: "Vasco",
    status: "LIVE",
    minute: 67,
    score: { home: 1, away: 0 },
    pressureScore: 78,
    stats: { shots: 18, shotsOnTarget: 9, dangerousAttacks: 44, corners: 7, xG: 1.82, possession: 58, yellowCards: 3, redCards: 0 },
    odds: { primary: 1.72, over05: 1.12, over15: 1.68, over25: 2.35, bttsYes: 1.85 },
  },
  {
    key: "pal-cor",
    league: "Brasileirão Série A",
    homeTeam: "Palmeiras",
    awayTeam: "Corinthians",
    status: "LIVE",
    minute: 54,
    score: { home: 2, away: 1 },
    pressureScore: 84,
    stats: { shots: 21, shotsOnTarget: 11, dangerousAttacks: 48, corners: 9, xG: 2.1, possession: 61, yellowCards: 2, redCards: 0 },
    odds: { primary: 1.55, over05: 1.08, over15: 1.45, over25: 1.95, bttsYes: 1.62 },
  },
  {
    key: "mci-ars",
    league: "Premier League",
    homeTeam: "Manchester City",
    awayTeam: "Arsenal",
    status: "LIVE",
    minute: 41,
    score: { home: 1, away: 1 },
    pressureScore: 71,
    stats: { shots: 14, shotsOnTarget: 6, dangerousAttacks: 36, corners: 5, xG: 1.45, possession: 54, yellowCards: 1, redCards: 0 },
    odds: { primary: 1.95, over05: 1.15, over15: 1.72, over25: 2.5, bttsYes: 1.7 },
  },
  {
    key: "bar-mad",
    league: "La Liga",
    homeTeam: "Barcelona",
    awayTeam: "Real Madrid",
    status: "HALFTIME",
    minute: 45,
    score: { home: 0, away: 0 },
    pressureScore: 62,
    stats: { shots: 9, shotsOnTarget: 3, dangerousAttacks: 28, corners: 4, xG: 0.88, possession: 52, yellowCards: 2, redCards: 0 },
    odds: { primary: 2.05, over05: 1.18, over15: 1.8, over25: 2.65, bttsYes: 1.75 },
  },
  {
    key: "int-mil",
    league: "Serie A",
    homeTeam: "Inter",
    awayTeam: "Milan",
    status: "LIVE",
    minute: 78,
    score: { home: 2, away: 2 },
    pressureScore: 88,
    stats: { shots: 24, shotsOnTarget: 12, dangerousAttacks: 51, corners: 10, xG: 2.45, possession: 55, yellowCards: 4, redCards: 1 },
    odds: { primary: 1.48, over05: 1.05, over15: 1.38, over25: 1.82, bttsYes: 1.55 },
  },
  {
    key: "bay-dor",
    league: "Bundesliga",
    homeTeam: "Bayern Munich",
    awayTeam: "Dortmund",
    status: "LIVE",
    minute: 33,
    score: { home: 0, away: 1 },
    pressureScore: 69,
    stats: { shots: 11, shotsOnTarget: 5, dangerousAttacks: 31, corners: 3, xG: 1.12, possession: 57, yellowCards: 1, redCards: 0 },
    odds: { primary: 1.88, over05: 1.14, over15: 1.65, over25: 2.2, bttsYes: 1.68 },
  },
  {
    key: "psg-olm",
    league: "Ligue 1",
    homeTeam: "PSG",
    awayTeam: "Marseille",
    status: "LIVE",
    minute: 59,
    score: { home: 1, away: 0 },
    pressureScore: 74,
    stats: { shots: 16, shotsOnTarget: 7, dangerousAttacks: 39, corners: 6, xG: 1.55, possession: 63, yellowCards: 2, redCards: 0 },
    odds: { primary: 1.62, over05: 1.1, over15: 1.52, over25: 2.05, bttsYes: 1.8 },
  },
  {
    key: "liv-atl",
    league: "Champions League",
    homeTeam: "Liverpool",
    awayTeam: "Atlético Madrid",
    status: "LIVE",
    minute: 82,
    score: { home: 2, away: 1 },
    pressureScore: 91,
    stats: { shots: 26, shotsOnTarget: 13, dangerousAttacks: 55, corners: 11, xG: 2.68, possession: 59, yellowCards: 3, redCards: 0 },
    odds: { primary: 1.42, over05: 1.04, over15: 1.32, over25: 1.75, bttsYes: 1.58 },
  },
  {
    key: "riv-boc",
    league: "Copa Libertadores",
    homeTeam: "River Plate",
    awayTeam: "Boca Juniors",
    status: "NOT_STARTED",
    minute: 0,
    score: { home: 0, away: 0 },
    pressureScore: 0,
    stats: { shots: 0, shotsOnTarget: 0, dangerousAttacks: 0, corners: 0, xG: 0, possession: 50, yellowCards: 0, redCards: 0 },
    odds: { primary: 2.1, over05: 1.22, over15: 1.95, over25: 3.1, bttsYes: 1.9 },
  },
  {
    key: "gre-por",
    league: "Brasileirão Série A",
    homeTeam: "Grêmio",
    awayTeam: "Internacional",
    status: "NOT_STARTED",
    minute: 0,
    score: { home: 0, away: 0 },
    pressureScore: 0,
    stats: { shots: 0, shotsOnTarget: 0, dangerousAttacks: 0, corners: 0, xG: 0, possession: 50, yellowCards: 0, redCards: 0 },
    odds: { primary: 1.98, over05: 1.2, over15: 1.88, over25: 2.8, bttsYes: 1.95 },
  },
  {
    key: "atm-sev",
    league: "La Liga",
    homeTeam: "Atlético Madrid",
    awayTeam: "Sevilla",
    status: "NOT_STARTED",
    minute: 0,
    score: { home: 0, away: 0 },
    pressureScore: 0,
    stats: { shots: 0, shotsOnTarget: 0, dangerousAttacks: 0, corners: 0, xG: 0, possession: 50, yellowCards: 0, redCards: 0 },
    odds: { primary: 1.75, over05: 1.16, over15: 1.7, over25: 2.4, bttsYes: 1.82 },
  },
  {
    key: "fin-1",
    league: "Premier League",
    homeTeam: "Tottenham",
    awayTeam: "Newcastle",
    status: "FINISHED",
    minute: 90,
    score: { home: 3, away: 2 },
    pressureScore: 0,
    stats: { shots: 19, shotsOnTarget: 10, dangerousAttacks: 42, corners: 8, xG: 2.2, possession: 56, yellowCards: 3, redCards: 0 },
    odds: { primary: 1.65, over05: 1.1, over15: 1.55, over25: 2.1, bttsYes: 1.65 },
  },
  {
    key: "fin-2",
    league: "Brasileirão Série A",
    homeTeam: "Fluminense",
    awayTeam: "Botafogo",
    status: "FINISHED",
    minute: 90,
    score: { home: 1, away: 1 },
    pressureScore: 0,
    stats: { shots: 15, shotsOnTarget: 7, dangerousAttacks: 35, corners: 6, xG: 1.65, possession: 48, yellowCards: 5, redCards: 0 },
    odds: { primary: 1.9, over05: 1.12, over15: 1.75, over25: 2.45, bttsYes: 1.72 },
  },
];

export const OPERATIONAL_EVENT_TEMPLATES = [
  { type: "goal_probable", headline: "Gol provável", narrative: "Pressão ofensiva e xG acima da média nos últimos 12 minutos." },
  { type: "over_heating", headline: "Over aquecendo", narrative: "Ritmo de finalizações sugere pelo menos mais um gol." },
  { type: "line_distorted", headline: "Linha distorceu", narrative: "Odd do Over 2.5 caiu 12% com o jogo ainda aberto." },
  { type: "market_reacted", headline: "Mercado reagiu", narrative: "Steam na odd principal após sequência de escanteios." },
  { type: "corners_high", headline: "Escanteios em alta", narrative: "7 escanteios no 2º tempo — pressão territorial constante." },
  { type: "pressure_spike", headline: "Pico de pressão", narrative: "Intensidade ofensiva subiu 18 pts em 5 minutos." },
  { type: "ev_plus", headline: "Entrada EV+", narrative: "Vantagem estatística detectada no Over 1.5 ao vivo." },
  { type: "btts_live", headline: "BTTS ao vivo", narrative: "Ambos marcando ou com xG combinado acima de 2.4." },
] as const;
