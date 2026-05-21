/**
 * SportMonks include profiles — Growth / premium live feed.
 * @see https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/livescores/get-inplay-livescores
 */

/** Target includes for Growth plan (validated against inplay endpoint). */
export const GROWTH_IDEAL_INCLUDES = [
  "participants",
  "scores",
  "league",
  "state",
  "periods",
  "venue",
  "statistics",
  "events",
  "lineups",
  "formations",
  "trends",
  "timeline",
  "inplayOdds.bookmaker",
  "inplayOdds.market",
  "inplayOdds",
  "premiumOdds",
  "xGFixture",
] as const;

/** Legacy ideal (pre-Growth). */
export const LEGACY_IDEAL_INCLUDES = [
  "participants",
  "scores",
  "league",
  "state",
  "periods",
  "statistics",
  "inplayOdds",
] as const;

/**
 * Tiers richest → minimal. Each step drops premium-heavy includes on HTTP 422.
 * `odds` / `markets` / `bookmakers` omitted — use inplayOdds / premiumOdds on inplay.
 */
export const GROWTH_INCLUDE_TIERS_DESCENDING: readonly string[][] = [
  [
    "participants",
    "scores",
    "league",
    "state",
    "periods",
    "venue",
    "statistics",
    "events",
    "lineups",
    "formations",
    "trends",
    "timeline",
    "inplayOdds.bookmaker",
    "inplayOdds.market",
    "inplayOdds",
    "premiumOdds",
    "xGFixture",
  ],
  [
    "participants",
    "scores",
    "league",
    "state",
    "periods",
    "venue",
    "statistics",
    "events",
    "lineups",
    "formations",
    "trends",
    "timeline",
    "inplayOdds",
    "xGFixture",
  ],
  [
    "participants",
    "scores",
    "league",
    "state",
    "periods",
    "venue",
    "statistics",
    "events",
    "lineups",
    "trends",
    "inplayOdds",
    "xGFixture",
  ],
  [
    "participants",
    "scores",
    "league",
    "state",
    "periods",
    "statistics",
    "events",
    "lineups",
    "inplayOdds",
    "xGFixture",
  ],
  [
    "participants",
    "scores",
    "league",
    "state",
    "periods",
    "statistics",
    "events",
    "inplayOdds",
    "xGFixture",
  ],
  [
    "participants",
    "scores",
    "league",
    "state",
    "periods",
    "statistics",
    "inplayOdds",
    "xGFixture",
  ],
  [
    "participants",
    "scores",
    "league",
    "state",
    "periods",
    "statistics",
    "inplayOdds",
  ],
  [
    "participants",
    "scores",
    "league",
    "state",
    "periods",
    "statistics",
  ],
  ["participants", "scores", "league", "state", "periods"],
  ["participants", "scores", "league", "state"],
  ["participants", "scores"],
  ["participants"],
  [],
];

export function isPremiumModeEnabled(): boolean {
  const flag = process.env.SPORTMONKS_PREMIUM_MODE?.trim().toLowerCase();
  if (flag === "true" || flag === "1" || flag === "yes") return true;
  const plan = process.env.SPORTMONKS_PLAN_NAME?.trim().toLowerCase() ?? "";
  return plan.includes("growth") || plan.includes("pro") || plan.includes("enterprise");
}

/** Bust cached include profile when premium mode or cache key changes. */
export function getIncludeCacheKey(): string {
  return isPremiumModeEnabled() ? "growth-premium-v4-odds" : "legacy-v1";
}
