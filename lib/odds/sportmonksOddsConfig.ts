/**
 * SportMonks odds feed — bet365 + mercados prioritários GoalPressure.
 * @see https://docs.sportmonks.com/v3/tutorials-and-guides/tutorials/odds-and-predictions/live-inplay-odds
 */

/** bet365 bookmaker id (SportMonks). */
export const BET365_BOOKMAKER_ID = 2;

/** Filtro URL SportMonks — conforme especificação institucional. */
export const ODDS_BOOKMAKER_FILTER = String(BET365_BOOKMAKER_ID);

/**
 * Mercados prioritários no parâmetro `filters=markets:...`
 * - 1 = Full Time Result (market id 1)
 * - over05, over15, over25, btts = slugs SportMonks no filtro
 */
export const ODDS_MARKETS_FILTER = "1,over05,over15,over25,btts";

/** Market id numérico conhecido — Full Time Result. */
export const SPORTMONKS_MARKET_ID_FULL_TIME_RESULT = 1;

/** Códigos internos GoalPressure → calibração / persistência. */
export const GP_MARKET_CODES = [
  "FULL_TIME_RESULT",
  "OVER_0_5",
  "OVER_1_5",
  "OVER_2_5",
  "BTTS",
] as const;

export type GpMarketCode = (typeof GP_MARKET_CODES)[number];

/** Mapeamento market_id SportMonks → código GP (quando conhecido). */
export const SPORTMONKS_MARKET_ID_TO_CODE: Record<number, GpMarketCode> = {
  1: "FULL_TIME_RESULT",
};

export function isOddsPremiumFeedEnabled(): boolean {
  const flag = process.env.SPORTMONKS_ODDS_PREMIUM?.trim().toLowerCase();
  if (flag === "false" || flag === "0" || flag === "no") return false;
  if (flag === "true" || flag === "1" || flag === "yes") return true;
  return (
    process.env.SPORTMONKS_PREMIUM_MODE === "true" ||
    (process.env.SPORTMONKS_PLAN_NAME ?? "").toLowerCase().includes("growth")
  );
}

export function buildOddsFiltersParam(): string {
  return `bookmakers:${ODDS_BOOKMAKER_FILTER};markets:${ODDS_MARKETS_FILTER}`;
}

/** Includes nested para inplayOdds (tentativa Growth). */
export const ODDS_NESTED_INCLUDES = [
  "inplayOdds.bookmaker",
  "inplayOdds.market",
] as const;
