import type { MarketType } from "@/types/domain";
import type { ExpectedValueResult, PressureScoreResult } from "@/types/engine";
import { PRESSURE_STABILITY_DELTA } from "@/lib/engine/pressure/pressureWeights";
import { getPressureScoreHistory } from "@/lib/engine/pressure/rollingWindow";

/** 5 minutes — same fixture + market */
export const SIGNAL_DEDUP_WINDOW_MS = 5 * 60_000;

const recentSignals = new Map<string, number>();

export interface AntiSpamCheckInput {
  matchId: string;
  market: MarketType;
  pressure: PressureScoreResult;
  ev: ExpectedValueResult;
  requirePositiveEv?: boolean;
}

export interface AntiSpamVerdict {
  allowed: boolean;
  reason?: string;
}

function fingerprint(matchId: string, market: MarketType): string {
  const fixtureId = matchId.replace(/^sm-/, "") || matchId;
  return `${fixtureId}|${market}`;
}

function isScoreStable(matchId: string): boolean {
  const history = getPressureScoreHistory(matchId);
  if (history.length < 3) return true;

  const recent = history.slice(-3);
  const min = Math.min(...recent);
  const max = Math.max(...recent);
  return max - min <= PRESSURE_STABILITY_DELTA;
}

function isDuplicate(fingerprintKey: string, nowMs: number): boolean {
  const last = recentSignals.get(fingerprintKey);
  if (!last) return false;
  return nowMs - last < SIGNAL_DEDUP_WINDOW_MS;
}

export function validateSignalAntiSpam(input: AntiSpamCheckInput): AntiSpamVerdict {
  const now = Date.now();

  if (input.pressure.score < 70) {
    return { allowed: false, reason: "pressure_below_entry" };
  }

  if (input.requirePositiveEv !== false) {
    if (input.ev.evPercent < 0.5 || input.ev.edge <= 0) {
      return { allowed: false, reason: "negative_ev" };
    }
  }

  if (!isScoreStable(input.matchId)) {
    return { allowed: false, reason: "unstable_pressure" };
  }

  const fp = fingerprint(input.matchId, input.market);
  if (isDuplicate(fp, now)) {
    return { allowed: false, reason: "duplicate_window" };
  }

  return { allowed: true };
}

export function markSignalEmitted(matchId: string, market: MarketType): void {
  recentSignals.set(fingerprint(matchId, market), Date.now());

  if (recentSignals.size > 800) {
    const cutoff = Date.now() - SIGNAL_DEDUP_WINDOW_MS * 2;
    for (const [key, ts] of recentSignals.entries()) {
      if (ts < cutoff) recentSignals.delete(key);
    }
  }
}

export function pruneAntiSpamState(): void {
  const cutoff = Date.now() - SIGNAL_DEDUP_WINDOW_MS * 4;
  for (const [key, ts] of recentSignals.entries()) {
    if (ts < cutoff) recentSignals.delete(key);
  }
}
