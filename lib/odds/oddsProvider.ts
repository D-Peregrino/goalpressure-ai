/**
 * GoalPressure AI — Odds Provider abstraction.
 * Preparado para SportMonks, The Odds API (futuro), fallback e manual.
 */

import type { Match, Odds } from "@/types/domain";

export type OddsProviderId =
  | "sportmonks"
  | "the_odds_api"
  | "fallback"
  | "manual";

export interface OddsQuote {
  market: "OVER_0_5" | "OVER_1_5";
  odd: number;
  impliedProbability: number;
  source: OddsProviderId;
  capturedAt: string;
}

export interface FixtureOddsBundle {
  fixtureId: string;
  primary: number;
  over05: number;
  over15: number;
  quotes: OddsQuote[];
  provider: OddsProviderId;
  stale: boolean;
}

export interface OddsProvider {
  id: OddsProviderId;
  resolve(match: Match): FixtureOddsBundle;
}

function impliedFromOdd(odd: number): number {
  if (odd <= 1) return 1;
  return 1 / odd;
}

function bundleFromMatch(match: Match, provider: OddsProviderId): FixtureOddsBundle {
  const fixtureId = match.externalId ?? match.id.replace(/^sm-/, "");
  const capturedAt = new Date().toISOString();
  const over05 = match.odds.over05;
  const over15 = match.odds.over15;

  return {
    fixtureId,
    primary: match.odds.primary,
    over05,
    over15,
    quotes: [
      {
        market: "OVER_0_5",
        odd: over05,
        impliedProbability: impliedFromOdd(over05),
        source: provider,
        capturedAt,
      },
      {
        market: "OVER_1_5",
        odd: over15,
        impliedProbability: impliedFromOdd(over15),
        source: provider,
        capturedAt,
      },
    ],
    provider,
    stale: false,
  };
}

/** SportMonks odds já mapeadas no Match. */
export const sportmonksOddsProvider: OddsProvider = {
  id: "sportmonks",
  resolve(match) {
    return bundleFromMatch(match, "sportmonks");
  },
};

/** Fallback heurístico quando odds ausentes. */
export const fallbackOddsProvider: OddsProvider = {
  id: "fallback",
  resolve(match) {
    const base = match.odds.primary > 1 ? match.odds : {
      primary: 1.85,
      over05: 1.45,
      over15: 2.1,
    };
    return bundleFromMatch(
      {
        ...match,
        odds: base as Odds,
      },
      "fallback"
    );
  },
};

/** Manual override (beta / ops). */
export function createManualOddsProvider(
  overrides: Record<string, Partial<Odds>>
): OddsProvider {
  return {
    id: "manual",
    resolve(match) {
      const fixtureId = match.externalId ?? match.id.replace(/^sm-/, "");
      const patch = overrides[fixtureId] ?? overrides[match.id];
      const odds: Odds = {
        primary: patch?.primary ?? match.odds.primary,
        over05: patch?.over05 ?? match.odds.over05,
        over15: patch?.over15 ?? match.odds.over15,
      };
      return bundleFromMatch({ ...match, odds }, "manual");
    },
  };
}

/** The Odds API — stub para integração futura. */
export const theOddsApiProvider: OddsProvider = {
  id: "the_odds_api",
  resolve(match) {
    return fallbackOddsProvider.resolve(match);
  },
};

/**
 * Resolve odds com cadeia: SportMonks → fallback (The Odds API quando chave existir).
 */
export function resolveFixtureOdds(match: Match): FixtureOddsBundle {
  const hasValid =
    match.odds.over05 > 1.01 && match.odds.over15 > 1.01 && match.odds.primary > 1.01;

  if (hasValid) {
    return sportmonksOddsProvider.resolve(match);
  }

  return fallbackOddsProvider.resolve(match);
}
