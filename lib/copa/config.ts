/**
 * GoalPressure Copa 2026 — SportMonks World Cup package.
 * @see https://docs.sportmonks.com/v3/world-cup-2026
 */

/** FIFA World Cup league id (SportMonks). Override via env if needed. */
export const COPA_LEAGUE_ID = Number(
  process.env.SPORTMONKS_COPA_LEAGUE_ID?.trim() || "732"
);

export const COPA_BRAND = {
  title: "GoalPressure Copa 2026",
  subtitle: "Centro especial da Copa do Mundo — leitura institucional ao vivo.",
  tournament: "Copa do Mundo FIFA 2026",
  host: "EUA · Canadá · México",
} as const;

/** Janela oficial aproximada (fixtures filter). */
export const COPA_WINDOW = {
  start: process.env.SPORTMONKS_COPA_START?.trim() || "2026-06-01",
  end: process.env.SPORTMONKS_COPA_END?.trim() || "2026-07-20",
} as const;

export const COPA_INCLUDES = [
  "participants",
  "scores",
  "state",
  "periods",
  "league",
  "venue",
  "statistics",
  "events",
] as const;

export const COPA_CACHE_TTL_MS = 60_000;
