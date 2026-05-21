/**
 * Monta feed de sinais live a partir de ops + matches enriquecidos (UI only).
 */

import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import type { OpsMarketCalibrationSnapshot } from "@/types/opsApi";
import {
  resolveOddPair,
  resolveSteamDirection,
  type OperationalState,
} from "@/lib/signals/executionWindow";

export type LiveSignalType =
  | "STEAM_MOVE"
  | "EDGE_ALERT"
  | "EV_PLUS"
  | "PRESSURE_SPIKE"
  | "CHAOS_BURST"
  | "EXECUTE_WINDOW";

export interface LiveSignalEntry {
  id: string;
  type: LiveSignalType;
  timestamp: string;
  fixtureId: string;
  matchLabel: string;
  market: string;
  previousOdd: number | null;
  currentOdd: number;
  edgePercent: number;
  confidence: number;
  chaos: number;
  urgency: number;
  operationalState?: OperationalState;
}

function formatMarketLabel(market: string): string {
  return market
    .replace(/_/g, " ")
    .replace(/OVER/gi, "OVER")
    .replace(/\s+/g, " ")
    .trim();
}

function matchLabel(m: EnrichedLiveMatch): string {
  return `${m.homeTeam} vs ${m.awayTeam}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function timeLabel(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return "--:--:--";
  }
}

export { timeLabel as formatSignalTime };

function pushSignal(
  out: LiveSignalEntry[],
  seen: Set<string>,
  entry: Omit<LiveSignalEntry, "id" | "timestamp"> & { timestamp?: string }
): void {
  const key = `${entry.type}|${entry.fixtureId}|${entry.market}|${entry.currentOdd}`;
  if (seen.has(key)) return;
  seen.add(key);
  out.push({
    ...entry,
    id: key,
    timestamp: entry.timestamp ?? nowIso(),
    market: formatMarketLabel(entry.market),
  });
}

/**
 * Gera entradas do Live Signal Feed (ordenadas por urgência, depois edge).
 */
export function buildLiveSignals(
  matches: EnrichedLiveMatch[],
  marketCalibration: OpsMarketCalibrationSnapshot | null | undefined,
  maxItems = 48
): LiveSignalEntry[] {
  const out: LiveSignalEntry[] = [];
  const seen = new Set<string>();
  const ts = nowIso();

  const matchByFixture = new Map(matches.map((m) => [m.fixtureId, m]));

  for (const edge of marketCalibration?.topEdges ?? []) {
    const m = matchByFixture.get(edge.fixtureId);
    const label =
      edge.matchLabel ??
      (m ? matchLabel(m) : edge.fixtureId);
    const { previousOdd, currentOdd } = resolveOddPair(
      edge.marketOdd,
      edge.oddsDrift ?? null
    );
    const current = currentOdd ?? edge.marketOdd ?? m?.odds.primary ?? 1;
    const prev = previousOdd;
    const conf = m?.confidence ?? 0;
    const chaos = m?.chaosIndex ?? 0;
    const urgency = m?.urgency ?? Math.round(edge.edgePercent * 4 + conf * 0.3);

    if (edge.steamMove) {
      pushSignal(out, seen, {
        type: "STEAM_MOVE",
        fixtureId: edge.fixtureId,
        matchLabel: label,
        market: edge.market,
        previousOdd: prev,
        currentOdd: current,
        edgePercent: edge.edgePercent,
        confidence: conf,
        chaos,
        urgency: Math.max(urgency, 75),
        operationalState: m?.operationalState,
        timestamp: ts,
      });
    }

    if (edge.edgePercent >= 10) {
      pushSignal(out, seen, {
        type: "EDGE_ALERT",
        fixtureId: edge.fixtureId,
        matchLabel: label,
        market: edge.market,
        previousOdd: prev,
        currentOdd: current,
        edgePercent: edge.edgePercent,
        confidence: conf,
        chaos,
        urgency,
        operationalState: m?.operationalState,
        timestamp: ts,
      });
    }

    if (
      edge.classification === "EV_PLUS" ||
      edge.classification === "STRONG_EDGE" ||
      edge.classification === "INSTITUTIONAL_EDGE"
    ) {
      pushSignal(out, seen, {
        type: "EV_PLUS",
        fixtureId: edge.fixtureId,
        matchLabel: label,
        market: edge.market,
        previousOdd: prev,
        currentOdd: current,
        edgePercent: edge.edgePercent,
        confidence: conf,
        chaos,
        urgency: Math.max(urgency, 70),
        operationalState: m?.operationalState,
        timestamp: ts,
      });
    }
  }

  for (const m of matches) {
    if (m.displayStatus !== "LIVE" && m.displayStatus !== "HT") continue;

    const topMarket = m.strongestEdgeMarket ?? m.markets[0]?.market ?? "MARKET";
    const topOdd =
      m.marketOdd ??
      m.markets.find((x) => x.odd != null && x.odd >= 1.01)?.odd ??
      m.odds.primary;
    const { previousOdd, currentOdd } = resolveOddPair(topOdd, m.oddsDrift);
    const current = currentOdd ?? topOdd ?? 1;

    if (m.operationalState === "EXECUTE") {
      pushSignal(out, seen, {
        type: "EXECUTE_WINDOW",
        fixtureId: m.fixtureId,
        matchLabel: matchLabel(m),
        market: topMarket,
        previousOdd,
        currentOdd: current,
        edgePercent: m.edgePercent ?? 0,
        confidence: m.confidence,
        chaos: m.chaosIndex,
        urgency: m.urgency,
        operationalState: m.operationalState,
        timestamp: ts,
      });
    }

    if (m.pressureScore >= 78) {
      pushSignal(out, seen, {
        type: "PRESSURE_SPIKE",
        fixtureId: m.fixtureId,
        matchLabel: matchLabel(m),
        market: topMarket,
        previousOdd,
        currentOdd: current,
        edgePercent: m.edgePercent ?? 0,
        confidence: m.confidence,
        chaos: m.chaosIndex,
        urgency: m.urgency,
        operationalState: m.operationalState,
        timestamp: ts,
      });
    }

    if (m.chaosIndex >= 68) {
      pushSignal(out, seen, {
        type: "CHAOS_BURST",
        fixtureId: m.fixtureId,
        matchLabel: matchLabel(m),
        market: topMarket,
        previousOdd,
        currentOdd: current,
        edgePercent: m.edgePercent ?? 0,
        confidence: m.confidence,
        chaos: m.chaosIndex,
        urgency: m.urgency,
        operationalState: m.operationalState,
        timestamp: ts,
      });
    }

    if (
      m.steamMove &&
      !seen.has(`STEAM_MOVE|${m.fixtureId}|${formatMarketLabel(topMarket)}|${current}`)
    ) {
      const dir = resolveSteamDirection(m.oddsDrift);
      if (dir === "DOWN" || dir === "FLAT") {
        pushSignal(out, seen, {
          type: "STEAM_MOVE",
          fixtureId: m.fixtureId,
          matchLabel: matchLabel(m),
          market: topMarket,
          previousOdd,
          currentOdd: current,
          edgePercent: m.edgePercent ?? 0,
          confidence: m.confidence,
          chaos: m.chaosIndex,
          urgency: Math.max(m.urgency, 72),
          operationalState: m.operationalState,
          timestamp: ts,
        });
      }
    }
  }

  return out
    .sort((a, b) => b.urgency - a.urgency || b.edgePercent - a.edgePercent)
    .slice(0, maxItems);
}
