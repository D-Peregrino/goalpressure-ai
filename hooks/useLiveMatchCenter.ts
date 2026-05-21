"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLiveMatches } from "@/hooks/useLiveMatches";
import { useOps } from "@/hooks/useOps";
import { fixtureIdFromMatch, normalizeFixtureId } from "@/lib/ui/matchFormatting";
import { normalizeLiveMatch } from "@/lib/ui/normalizeLiveMatch";
import type { Match, MatchStatus, Odds } from "@/types/domain";

export type MatchCenterFilter =
  | "all"
  | "live"
  | "upcoming"
  | "high_pressure"
  | "ev_plus"
  | "execute"
  | "favorites";

export interface EnrichedLiveMatch {
  fixtureId: string;
  matchId: string;
  league: string;
  round?: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  scoreKnown: boolean;
  minute: number | null;
  minuteLabel: string;
  status: MatchStatus | undefined;
  displayStatus: ReturnType<typeof import("@/lib/ui/matchFormatting").toDisplayStatus>;
  homeLogo: string | null;
  awayLogo: string | null;
  debug?: { scoreMissing?: boolean; fixtureMissing?: boolean };
  odds: Odds;
  pressureScore: number;
  homePressure: number;
  awayPressure: number;
  momentum: number;
  chaosIndex: number;
  edgePercent: number | null;
  ev: number | null;
  confidence: number;
  executionGrade: string | null;
  executionDecision: string | null;
  sequenceState: string | null;
  triggerWindow: string | null;
  microeventScore: number | null;
  microeventBadges: string[];
  recentEvents: string[];
  markets: { market: string; odd?: number; edge?: number; ev?: number }[];
  matchPhase: string | null;
  dominantSide: "home" | "away" | "balanced";
}

const SUPPLEMENTARY_PATHS = [
  "/api/meta/live",
  "/api/market/edges",
  "/api/temporal/live",
  "/api/microevent/live",
  "/api/sequence/live",
  "/api/player/runtime",
] as const;

const FAVORITES_KEY = "gp-match-favorites";

async function fetchOptional(path: string): Promise<unknown | null> {
  try {
    const res = await fetch(path, { cache: "no-store", headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const body = await res.json();
    if (body && typeof body === "object" && "ok" in body && body.ok === false) return null;
    return body;
  } catch {
    console.warn(`[useLiveMatchCenter] optional fetch failed: ${path}`);
    return null;
  }
}

function splitPressure(
  match: Match,
  ops?: {
    homePressure: number;
    awayPressure: number;
    pressureScore: number;
    momentum: number;
  } | null
) {
  if (ops) {
    return {
      home: ops.homePressure,
      away: ops.awayPressure,
      total: ops.pressureScore,
      momentum: ops.momentum,
    };
  }
  const total = match.pressure.score;
  if (match.teamStats) {
    const h =
      match.teamStats.home.dangerousAttacks +
      match.teamStats.home.shots +
      (match.teamStats.home.totalAttacks ?? 0);
    const a =
      match.teamStats.away.dangerousAttacks +
      match.teamStats.away.shots +
      (match.teamStats.away.totalAttacks ?? 0);
    const sum = h + a || 1;
    return { home: (total * h) / sum, away: (total * a) / sum, total, momentum: 0 };
  }
  return { home: total / 2, away: total / 2, total, momentum: 0 };
}

function buildRecentEvents(parts: {
  chaosIndex: number;
  microeventScore: number | null;
  sequenceState: string | null;
  triggerWindow: string | null;
  matchPhase: string | null;
}): string[] {
  const events: string[] = [];
  if (parts.matchPhase) events.push(parts.matchPhase);
  if (parts.chaosIndex >= 65) events.push("Caos ofensivo");
  if ((parts.microeventScore ?? 0) >= 60) events.push("Microevento ativo");
  if (parts.triggerWindow) events.push(parts.triggerWindow);
  if (parts.sequenceState) events.push(parts.sequenceState);
  return events.slice(0, 4);
}

export function useLiveMatchCenter() {
  const live = useLiveMatches({ pollIntervalMs: 20_000 });
  const ops = useOps({ pollIntervalMs: 15_000 });
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());
  const [filter, setFilter] = useState<MatchCenterFilter>("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const supplementaryOk = useRef(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      if (raw) setFavorites(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* ignore */
    }
  }, []);

  const persistFavorites = useCallback((next: Set<string>) => {
    setFavorites(next);
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify([...next]));
    } catch {
      /* ignore */
    }
  }, []);

  const toggleFavorite = useCallback(
    (fixtureId: string) => {
      const next = new Set(favorites);
      if (next.has(fixtureId)) next.delete(fixtureId);
      else next.add(fixtureId);
      persistFavorites(next);
    },
    [favorites, persistFavorites]
  );

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      await Promise.allSettled(SUPPLEMENTARY_PATHS.map((p) => fetchOptional(p)));
      if (!cancelled) supplementaryOk.current = true;
    };
    void run();
    const id = window.setInterval(run, 25_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const enriched = useMemo((): EnrichedLiveMatch[] => {
    return live.matches.map((match) => {
      const fixtureId = fixtureIdFromMatch(match);
      const pressureOps = ops.livePressure?.metrics.find((m) => m.fixtureId === fixtureId);
      const meta = ops.metaConsensus?.consensusHeatmap.find((c) => c.fixtureId === fixtureId);
      const temporal = ops.temporal?.chaosMap.find((c) => c.fixtureId === fixtureId);
      const micro = ops.microevent?.chaosBursts.find((c) => c.fixtureId === fixtureId);
      const microTrigger = ops.microevent?.topTriggerWindows.find(
        (c) => c.fixtureId === fixtureId
      );
      const sequence = ops.sequenceMemory?.sustainedChaos.find((c) => c.fixtureId === fixtureId);
      const edges = (ops.marketCalibration?.topEdges ?? []).filter(
        (e) => e.fixtureId === fixtureId
      );
      const signal = ops.signalDecision?.activeSignals.find((s) => s.fixtureId === fixtureId);

      const split = splitPressure(match, pressureOps ?? null);
      const chaosIndex =
        sequence?.sustainedChaosLevel ?? temporal?.chaosIndex ?? micro?.microeventScore ?? 0;
      const topEdge = edges[0];
      const homeP = split.home;
      const awayP = split.away;
      const dominantSide: EnrichedLiveMatch["dominantSide"] =
        homeP > awayP + 8 ? "home" : awayP > homeP + 8 ? "away" : "balanced";

      const microeventBadges: string[] = [];
      if ((micro?.microeventScore ?? 0) >= 55) microeventBadges.push("Burst");
      if ((micro?.chaosBurst ?? 0) >= 50) microeventBadges.push("Chaos wave");

      const core = normalizeLiveMatch(match, {
        opsMinute: pressureOps?.minute,
        warnContext: fixtureId,
      });

      return {
        fixtureId: core.fixtureId,
        matchId: match.id,
        league: match.league,
        homeTeam: core.homeTeam,
        awayTeam: core.awayTeam,
        homeScore: core.homeScore,
        awayScore: core.awayScore,
        scoreKnown: core.scoreKnown,
        minute: core.minute,
        minuteLabel: core.minuteLabel,
        status: core.status,
        displayStatus: core.displayStatus,
        homeLogo: core.homeLogo,
        awayLogo: core.awayLogo,
        debug: core.debug,
        odds: match.odds,
        pressureScore: split.total,
        homePressure: homeP,
        awayPressure: awayP,
        momentum: split.momentum,
        chaosIndex,
        edgePercent: topEdge?.edgePercent ?? null,
        ev: signal?.ev ?? topEdge?.expectedValue ?? null,
        confidence:
          meta?.institutionalConfidence ??
          pressureOps?.confidence ??
          match.pressure.score,
        executionGrade: meta?.executionGrade ?? null,
        executionDecision: meta?.executionDecision ?? null,
        sequenceState: sequence?.sequenceState ?? null,
        triggerWindow: microTrigger?.triggerWindow ?? null,
        microeventScore: micro?.microeventScore ?? null,
        microeventBadges,
        recentEvents: buildRecentEvents({
          chaosIndex,
          microeventScore: micro?.microeventScore ?? null,
          sequenceState: sequence?.sequenceState ?? null,
          triggerWindow: microTrigger?.triggerWindow ?? null,
          matchPhase: temporal?.matchPhase ?? null,
        }),
        markets: [
          { market: "Over 0.5", odd: match.odds.over05, edge: edges.find((e) => e.market.includes("0.5"))?.edgePercent },
          { market: "Over 1.5", odd: match.odds.over15, edge: edges.find((e) => e.market.includes("1.5"))?.edgePercent },
          ...edges.slice(0, 2).map((e) => ({
            market: e.market,
            edge: e.edgePercent,
            ev: e.expectedValue,
          })),
        ],
        matchPhase: temporal?.matchPhase ?? null,
        dominantSide,
      };
    });
  }, [live.matches, ops]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter((m) => {
      if (q) {
        const hay = `${m.homeTeam} ${m.awayTeam} ${m.league}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      switch (filter) {
        case "live":
          return m.displayStatus === "LIVE" || m.displayStatus === "HT";
        case "upcoming":
          return m.displayStatus === "PRE";
        case "high_pressure":
          return m.pressureScore >= 70;
        case "ev_plus":
          return (m.ev ?? 0) >= 0.03 || (m.edgePercent ?? 0) >= 3;
        case "execute": {
          const d = (m.executionDecision ?? "").toUpperCase();
          return d === "EXECUTE" || d === "AGGRESSIVE_EXECUTE";
        }
        case "favorites":
          return favorites.has(m.fixtureId);
        default:
          return true;
      }
    });
  }, [enriched, filter, search, favorites]);

  const kpis = useMemo(
    () => ({
      tracked: enriched.length,
      live: enriched.filter((m) => m.displayStatus === "LIVE" || m.displayStatus === "HT").length,
      signals: ops.signalDecision?.activeSignals.length ?? live.signals.length,
      avgEdge: ops.marketCalibration?.averageEdge ?? 0,
      confidence: ops.metaConsensus?.averageInstitutionalConfidence ?? 0,
      execute: enriched.filter((m) => {
        const d = (m.executionDecision ?? "").toUpperCase();
        return d === "EXECUTE" || d === "AGGRESSIVE_EXECUTE";
      }).length,
    }),
    [enriched, ops, live.signals.length]
  );

  return {
    matches: filtered,
    allMatches: enriched,
    kpis,
    filter,
    setFilter,
    search,
    setSearch,
    viewMode,
    setViewMode,
    favorites,
    toggleFavorite,
    feedStatus: live.status,
    opsStatus: ops.status,
    lastUpdated: live.lastUpdated,
    source: live.source,
    isLoading: live.isInitialLoad && ops.isInitialLoad,
    normalizeFixtureId,
  };
}
