/**
 * Normaliza odds SportMonks (bet365) → quotes institucionais para Market Calibration.
 */

import type { SportmonksFixture, SportmonksOdds } from "@/lib/mappers/sportmonks";
import { resolveAllFixtureOdds } from "@/lib/mappers/sportmonksPremium";
import {
  BET365_BOOKMAKER_ID,
  type GpMarketCode,
  GP_MARKET_CODES,
  SPORTMONKS_MARKET_ID_FULL_TIME_RESULT,
  SPORTMONKS_MARKET_ID_TO_CODE,
} from "@/lib/odds/sportmonksOddsConfig";
import type { Odds } from "@/types/domain";

export interface NormalizedOddQuote {
  bookmakerId: number;
  bookmakerName: string;
  marketId: number | null;
  marketCode: GpMarketCode | string;
  marketName: string;
  line: string | null;
  label: string;
  odd: number;
  impliedProbability: number;
  capturedAt: string;
}

export interface FixtureOddsBundle {
  bookmakerId: number;
  bookmakerName: string;
  quotes: NormalizedOddQuote[];
  /** Odds resumo para UI legada */
  summary: Odds;
  marketsDetected: string[];
}

function safeNum(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const p = Number.parseFloat(v);
    if (Number.isFinite(p)) return p;
  }
  return fallback;
}

function impliedFromOdd(odd: number): number {
  if (odd < 1.01) return 0;
  return Math.round((1 / odd) * 10000) / 10000;
}

function isBet365(entry: SportmonksOdds): boolean {
  const bid = entry.bookmaker_id;
  if (bid === BET365_BOOKMAKER_ID) return true;
  const nested = (entry as SportmonksOdds & { bookmaker?: { id?: number; name?: string } })
    .bookmaker;
  if (nested?.id === BET365_BOOKMAKER_ID) return true;
  const name = (nested?.name ?? "").toLowerCase();
  return name.includes("bet365") || name.includes("bet 365");
}

function haystack(entry: SportmonksOdds): string {
  const market = (entry as SportmonksOdds & {
    market?: { name?: string; developer_name?: string };
  }).market;
  return [
    entry.label,
    entry.name,
    entry.market_description,
    market?.name,
    market?.developer_name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function resolveMarketCode(entry: SportmonksOdds): GpMarketCode | string | null {
  const mid = entry.market_id;
  if (mid != null && SPORTMONKS_MARKET_ID_TO_CODE[mid]) {
    return SPORTMONKS_MARKET_ID_TO_CODE[mid];
  }

  const text = haystack(entry);

  if (
    mid === SPORTMONKS_MARKET_ID_FULL_TIME_RESULT ||
    text.includes("fulltime") ||
    text.includes("full time") ||
    text.includes("match winner") ||
    text.includes("1x2")
  ) {
    return "FULL_TIME_RESULT";
  }

  if (
    text.includes("over 0.5") ||
    text.includes("over 0,5") ||
    text.includes("o/u 0.5") ||
    text.includes("over/under 0.5")
  ) {
    return "OVER_0_5";
  }

  if (
    text.includes("over 1.5") ||
    text.includes("over 1,5") ||
    text.includes("o/u 1.5")
  ) {
    return "OVER_1_5";
  }

  if (
    text.includes("over 2.5") ||
    text.includes("over 2,5") ||
    text.includes("o/u 2.5")
  ) {
    return "OVER_2_5";
  }

  if (
    text.includes("btts") ||
    text.includes("both teams to score") ||
    text.includes("both teams score")
  ) {
    return "BTTS";
  }

  return null;
}

function extractLine(entry: SportmonksOdds): string | null {
  const label = (entry.label ?? entry.name ?? "").trim();
  if (label) return label;
  return null;
}

function normalizeRawEntry(entry: SportmonksOdds): NormalizedOddQuote | null {
  try {
    if (!isBet365(entry)) return null;

    const odd = safeNum(entry.value, 0);
    if (odd < 1.01) return null;

    const marketCode = resolveMarketCode(entry);
    if (!marketCode) return null;

    const nestedBookmaker = (
      entry as SportmonksOdds & { bookmaker?: { id?: number; name?: string } }
    ).bookmaker;
    const nestedMarket = (
      entry as SportmonksOdds & { market?: { id?: number; name?: string } }
    ).market;

    return {
      bookmakerId: nestedBookmaker?.id ?? entry.bookmaker_id ?? BET365_BOOKMAKER_ID,
      bookmakerName: nestedBookmaker?.name ?? "bet365",
      marketId: nestedMarket?.id ?? entry.market_id ?? null,
      marketCode,
      marketName:
        nestedMarket?.name ?? entry.market_description ?? String(marketCode),
      line: extractLine(entry),
      label: entry.label ?? entry.name ?? String(marketCode),
      odd,
      impliedProbability: impliedFromOdd(odd),
      capturedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/** Uma quote por marketCode (melhor odd = menor para Over, Yes para BTTS). */
function pickBestPerMarket(quotes: NormalizedOddQuote[]): NormalizedOddQuote[] {
  const byCode = new Map<string, NormalizedOddQuote>();

  for (const q of quotes) {
    const key = String(q.marketCode);
    const prev = byCode.get(key);
    if (!prev) {
      byCode.set(key, q);
      continue;
    }

    const isYesNo = key === "BTTS" || key === "FULL_TIME_RESULT";
    if (isYesNo) {
      if (q.odd < prev.odd) byCode.set(key, q);
    } else {
      if (q.odd < prev.odd) byCode.set(key, q);
    }
  }

  return [...byCode.values()];
}

function buildSummaryOdds(quotes: NormalizedOddQuote[]): Odds {
  const find = (code: GpMarketCode) => quotes.find((q) => q.marketCode === code)?.odd;

  const over05 = find("OVER_0_5");
  const over15 = find("OVER_1_5");
  const over25 = find("OVER_2_5");
  const btts = find("BTTS");
  const ftr = find("FULL_TIME_RESULT");

  const primary = over05 ?? over15 ?? ftr ?? 1;

  return {
    primary: primary >= 1.01 ? primary : 1,
    over05: over05 ?? primary,
    over15: over15 ?? primary,
    over25: over25 ?? over15 ?? primary,
    bttsYes: btts ?? 1,
    fullTimeResult: ftr ?? 1,
    bookmakerId: BET365_BOOKMAKER_ID,
    bookmakerName: "bet365",
  };
}

/**
 * Normaliza odds bet365 de um fixture in-play.
 */
export function normalizeFixtureOdds(fixture: SportmonksFixture): FixtureOddsBundle {
  const defaults: FixtureOddsBundle = {
    bookmakerId: BET365_BOOKMAKER_ID,
    bookmakerName: "bet365",
    quotes: [],
    summary: { primary: 1, over05: 1, over15: 1, over25: 1, bttsYes: 1, fullTimeResult: 1 },
    marketsDetected: [],
  };

  try {
    const raw = resolveAllFixtureOdds(fixture);
    const parsed: NormalizedOddQuote[] = [];

    for (const entry of raw) {
      const q = normalizeRawEntry(entry);
      if (q) parsed.push(q);
    }

    const quotes = pickBestPerMarket(parsed);
    const marketsDetected = quotes.map((q) => String(q.marketCode));

    return {
      bookmakerId: BET365_BOOKMAKER_ID,
      bookmakerName: "bet365",
      quotes,
      summary: buildSummaryOdds(quotes),
      marketsDetected,
    };
  } catch {
    return defaults;
  }
}

export function getCalibrationQuotes(match: {
  odds: Odds;
  oddsQuotes?: NormalizedOddQuote[];
}): NormalizedOddQuote[] {
  if (match.oddsQuotes && match.oddsQuotes.length > 0) {
    return match.oddsQuotes.filter((q) => q.odd >= 1.01);
  }

  const fallback: NormalizedOddQuote[] = [];
  const push = (code: GpMarketCode, odd: number | undefined) => {
    if (odd == null || odd < 1.01) return;
    fallback.push({
      bookmakerId: BET365_BOOKMAKER_ID,
      bookmakerName: "bet365",
      marketId: code === "FULL_TIME_RESULT" ? 1 : null,
      marketCode: code,
      marketName: code,
      line: null,
      label: code,
      odd,
      impliedProbability: impliedFromOdd(odd),
      capturedAt: new Date().toISOString(),
    });
  };

  push("OVER_0_5", match.odds.over05);
  push("OVER_1_5", match.odds.over15);
  push("OVER_2_5", match.odds.over25);
  push("BTTS", match.odds.bttsYes);
  push("FULL_TIME_RESULT", match.odds.fullTimeResult);

  return fallback;
}
