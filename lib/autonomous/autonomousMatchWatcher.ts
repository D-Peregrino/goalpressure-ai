import type { Match } from "@/types/domain";
import { getPressureScoreHistory } from "@/lib/engine/pressure/rollingWindow";

export interface FixtureWatchSnapshot {
  fixtureId: string;
  pressure: number;
  momentum: number;
  dangerousAttacks: number;
  acceleration: number;
  contextScore: number;
  minute: number;
}

export interface FixtureWatchState {
  fixtureId: string;
  matchId: string;
  pressureSamples: number[];
  momentumSamples: number[];
  dangerousSamples: number[];
  momentumRisingStreak: number;
  momentumFallingStreak: number;
  peakPressure: number;
  lastContextScore: number;
  lastMinute: number;
  wasActive: boolean;
  wasLive: boolean;
  lastStatus?: string;
}

const watchers = new Map<string, FixtureWatchState>();

function fixtureId(match: Match): string {
  return match.externalId ?? match.id.replace(/^sm-/, "") ?? match.id;
}

function dangerousTotal(match: Match): number {
  return match.stats.dangerousAttacks ?? 0;
}

function momentumScore(match: Match): number {
  return match.feedMeta?.offensiveEngine?.momentumScore ?? match.premium?.momentumScore ?? 0;
}

function accelerationScore(match: Match): number {
  return match.feedMeta?.offensiveEngine?.accelerationScore ?? 0;
}

export function getFixtureWatchState(fixture: string): FixtureWatchState | undefined {
  return watchers.get(fixture);
}

export function updateFixtureWatcher(
  match: Match,
  contextScore: number
): FixtureWatchState {
  const fid = fixtureId(match);
  const pressure = match.pressure?.score ?? 0;
  const momentum = momentumScore(match);
  const dangerous = dangerousTotal(match);
  const prev = watchers.get(fid);

  const pressureSamples = [...(prev?.pressureSamples ?? []), pressure].slice(-6);
  const momentumSamples = [...(prev?.momentumSamples ?? []), momentum].slice(-6);
  const dangerousSamples = [...(prev?.dangerousSamples ?? []), dangerous].slice(-6);

  let momentumRisingStreak = prev?.momentumRisingStreak ?? 0;
  let momentumFallingStreak = prev?.momentumFallingStreak ?? 0;

  if (momentumSamples.length >= 2) {
    const last = momentumSamples[momentumSamples.length - 1]!;
    const prevM = momentumSamples[momentumSamples.length - 2]!;
    if (last > prevM + 2) {
      momentumRisingStreak += 1;
      momentumFallingStreak = 0;
    } else if (last < prevM - 2) {
      momentumFallingStreak += 1;
      momentumRisingStreak = 0;
    } else {
      momentumRisingStreak = Math.max(0, momentumRisingStreak - 1);
      momentumFallingStreak = Math.max(0, momentumFallingStreak - 1);
    }
  }

  const peakPressure = Math.max(prev?.peakPressure ?? 0, pressure);
  const wasActive = prev?.wasActive ?? false;
  const activeNow = pressure >= 55 || contextScore >= 60;

  const state: FixtureWatchState = {
    fixtureId: fid,
    matchId: match.id,
    pressureSamples,
    momentumSamples,
    dangerousSamples,
    momentumRisingStreak,
    momentumFallingStreak,
    peakPressure,
    lastContextScore: contextScore,
    lastMinute: match.minute ?? 0,
    wasActive: wasActive || activeNow,
    wasLive: match.status === "LIVE" || match.status === "HALFTIME",
    lastStatus: match.status,
  };

  watchers.set(fid, state);
  return state;
}

export function detectPressureSpike(state: FixtureWatchState): boolean {
  if (state.pressureSamples.length < 2) return false;
  const last = state.pressureSamples[state.pressureSamples.length - 1]!;
  const prev = state.pressureSamples[state.pressureSamples.length - 2]!;
  return last - prev >= 14;
}

export function detectDangerousAcceleration(state: FixtureWatchState): boolean {
  if (state.dangerousSamples.length < 2) return false;
  const last = state.dangerousSamples[state.dangerousSamples.length - 1]!;
  const prev = state.dangerousSamples[state.dangerousSamples.length - 2]!;
  return last - prev >= 3;
}

export function detectDefensiveCollapse(match: Match, state: FixtureWatchState): boolean {
  const history = getPressureScoreHistory(match.id);
  if (history.length < 3) return false;
  const recent = history.slice(-3);
  const drop = recent[0]! - recent[recent.length - 1]!;
  return drop >= 18 && state.peakPressure >= 70;
}

export function detectContextFade(state: FixtureWatchState, contextScore: number): boolean {
  return state.wasActive && contextScore <= 42 && state.lastContextScore - contextScore >= 18;
}

export function pruneWatchers(activeFixtureIds: Set<string>): void {
  for (const fid of watchers.keys()) {
    if (!activeFixtureIds.has(fid)) watchers.delete(fid);
  }
}

export function buildWatchSnapshot(match: Match, contextScore: number): FixtureWatchSnapshot {
  return {
    fixtureId: fixtureId(match),
    pressure: match.pressure?.score ?? 0,
    momentum: momentumScore(match),
    dangerousAttacks: dangerousTotal(match),
    acceleration: accelerationScore(match),
    contextScore,
    minute: match.minute ?? 0,
  };
}
