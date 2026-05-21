/**
 * Rastreamento in-memory de odds por fixture+mercado (drift, steam, closing line).
 */

import type { MarketType } from "@/types/domain";

interface OddsHistoryEntry {
  odd: number;
  capturedAt: number;
}

interface FixtureMarketSlot {
  openingOdd: number | null;
  history: OddsHistoryEntry[];
}

const slots = new Map<string, FixtureMarketSlot>();

function key(fixtureId: string, market: string): string {
  return `${fixtureId}|${market}`;
}

const MAX_HISTORY = 40;
const STEAM_WINDOW_MS = 3 * 60_000;

export function recordMarketOdd(
  fixtureId: string,
  market: MarketType | string,
  odd: number
): { previousOdd?: number; openingOdd?: number } {
  const k = key(fixtureId, market);
  const now = Date.now();
  let slot = slots.get(k);

  if (!slot) {
    slot = { openingOdd: odd, history: [] };
    slots.set(k, slot);
  }

  const previousOdd =
    slot.history.length > 0
      ? slot.history[slot.history.length - 1].odd
      : undefined;

  if (slot.openingOdd == null) {
    slot.openingOdd = odd;
  }

  const last = slot.history[slot.history.length - 1];
  if (!last || Math.abs(last.odd - odd) >= 0.01) {
    slot.history.push({ odd, capturedAt: now });
    if (slot.history.length > MAX_HISTORY) {
      slot.history.shift();
    }
  }

  return { previousOdd, openingOdd: slot.openingOdd ?? undefined };
}

export function detectSteamMove(
  fixtureId: string,
  market: MarketType | string
): boolean {
  const slot = slots.get(key(fixtureId, market));
  if (!slot || slot.history.length < 2) return false;

  const now = Date.now();
  const recent = slot.history.filter((h) => now - h.capturedAt <= STEAM_WINDOW_MS);
  if (recent.length < 2) return false;

  const first = recent[0].odd;
  const last = recent[recent.length - 1].odd;
  return last < first && (first - last) / first >= 0.05;
}

export function getClosingLineEfficiency(
  fixtureId: string,
  market: MarketType | string,
  proprietaryProbability: number,
  finalOdd: number
): number {
  const implied = 1 / clampOdd(finalOdd);
  const edgeAtClose = proprietaryProbability - implied;
  return Math.round(clamp(edgeAtClose * 500 + 50, 0, 100));
}

function clampOdd(n: number): number {
  return Math.min(50, Math.max(1.01, n));
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function pruneMarketEdgeTracker(maxAgeMs = 60 * 60_000): void {
  const cutoff = Date.now() - maxAgeMs;
  for (const [k, slot] of slots.entries()) {
    slot.history = slot.history.filter((h) => h.capturedAt >= cutoff);
    if (slot.history.length === 0) slots.delete(k);
  }
}

export function getTrackerSize(): number {
  return slots.size;
}
