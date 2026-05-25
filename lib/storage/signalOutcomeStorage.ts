/**
 * Signal outcome tracking — validates HIT/MISS after matches end.
 * Integrates with match timelines in data/matches/.
 */

import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { LiveMatchesApiMeta } from "@/types/api";
import type {
  MarketType,
  Match,
  MatchScore,
  MatchStatus,
  Signal,
  SignalConfidence,
} from "@/types/domain";
import {
  buildMatchTimelineFilename,
  type MatchTimelineDocument,
} from "@/lib/storage/matchTimelineStorage";
import { logInfo, logWarn } from "@/lib/utils/logger";
import {
  recordFromResolvedSignal,
  recordSignalOutcome,
} from "@/lib/engine/learning/recordSignalOutcome";
import { scheduleLearningFeedbackLoop } from "@/lib/engine/learning/runLearningFeedbackLoop";

const LOG_SCOPE = "signal-outcome-storage";
const SIGNALS_DIR = path.join(process.cwd(), "data", "signals");
const MATCHES_DIR = path.join(process.cwd(), "data", "matches");
const MIN_DUPLICATE_MS = 90_000;

const FINISHED_STATUSES: MatchStatus[] = [
  "FINISHED",
  "CANCELLED",
  "POSTPONED",
];

export type SignalTrackingStatus = "PENDING" | "ACTIVE" | "RESOLVED";
export type SignalOutcome = "HIT" | "MISS";

export interface SignalOutcomeRecord {
  signalId: string;
  matchId: string;
  externalId: string;
  market: MarketType;
  confidence: SignalConfidence;
  stake: number;
  createdAt: string;
  triggerMinute: number;
  triggerScore: MatchScore;
  triggerPressure: number;
  triggerOdds: number;
  homeTeam: string;
  awayTeam: string;
  league: string;
  status: SignalTrackingStatus;
  outcome: SignalOutcome | null;
  roi: number | null;
  resolvedAt: string | null;
  resolutionMinute: number | null;
  timeToResolution: number | null;
  finalScore: MatchScore | null;
  metadata: {
    source: string;
    reason: string;
    goalsAtTrigger: number;
    goalsAtResolution: number | null;
    newGoalsAfterSignal: number | null;
    lastUpdatedAt: string;
    timelineFinishedAt?: string;
  };
}

export interface TrackSignalOutcomesResult {
  created: number;
  updated: number;
  resolved: number;
  skippedDuplicate: number;
}

let ensureDirPromise: Promise<void> | null = null;

async function ensureSignalsDir(): Promise<void> {
  if (!ensureDirPromise) {
    ensureDirPromise = mkdir(SIGNALS_DIR, { recursive: true }).then(() => undefined);
  }
  await ensureDirPromise;
}

function sanitizeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function totalGoals(score?: MatchScore | null): number {
  if (!score) return 0;
  return score.home + score.away;
}

function isMatchFinished(status?: MatchStatus): boolean {
  if (!status) return false;
  return FINISHED_STATUSES.includes(status);
}

export function buildSignalOutcomeFilename(
  matchId: string,
  createdAtMs: number
): string {
  const ts = new Date(createdAtMs)
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);
  return `signal-${sanitizeId(matchId)}-${ts}.json`;
}

function signalFingerprint(signal: Signal): string {
  return `${signal.matchId}|${signal.market}|${signal.confidence}`;
}

function buildSignalId(matchId: string, market: MarketType, createdAtMs: number): string {
  return `${sanitizeId(matchId)}-${market}-${createdAtMs}`;
}

function createRecordFromSignal(
  match: Match,
  signal: Signal,
  meta: LiveMatchesApiMeta,
  createdAtMs: number
): SignalOutcomeRecord {
  const createdAt = new Date(createdAtMs).toISOString();
  const triggerScore: MatchScore = match.score
    ? { ...match.score }
    : { home: 0, away: 0 };

  return {
    signalId: buildSignalId(match.id, signal.market, createdAtMs),
    matchId: match.id,
    externalId: match.externalId ?? match.id.replace(/^sm-/, ""),
    market: signal.market,
    confidence: signal.confidence,
    stake: signal.stake,
    createdAt,
    triggerMinute: match.minute,
    triggerScore,
    triggerPressure: signal.pressureScore,
    triggerOdds: signal.odd,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    league: match.league,
    status: "PENDING",
    outcome: null,
    roi: null,
    resolvedAt: null,
    resolutionMinute: null,
    timeToResolution: null,
    finalScore: null,
    metadata: {
      source: meta.source,
      reason: signal.reason,
      goalsAtTrigger: totalGoals(triggerScore),
      goalsAtResolution: null,
      newGoalsAfterSignal: null,
      lastUpdatedAt: createdAt,
    },
  };
}

function calculateRoi(outcome: SignalOutcome, odd: number): number {
  return outcome === "HIT" ? Number((odd - 1).toFixed(4)) : -1;
}

function resolveMarketOutcome(
  market: MarketType,
  goalsAtTrigger: number,
  goalsAtResolution: number,
  odd: number
): { outcome: SignalOutcome; roi: number } {
  const newGoals = Math.max(0, goalsAtResolution - goalsAtTrigger);

  if (market === "OVER_0_5") {
    const outcome: SignalOutcome = newGoals >= 1 ? "HIT" : "MISS";
    return { outcome, roi: calculateRoi(outcome, odd) };
  }

  if (market === "OVER_1_5") {
    const outcome: SignalOutcome = newGoals >= 2 ? "HIT" : "MISS";
    return { outcome, roi: calculateRoi(outcome, odd) };
  }

  const outcome: SignalOutcome = "MISS";
  return { outcome, roi: -1 };
}

async function readSignalRecord(filePath: string): Promise<SignalOutcomeRecord | null> {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as SignalOutcomeRecord;
  } catch {
    return null;
  }
}

async function listSignalFiles(): Promise<string[]> {
  await ensureSignalsDir();
  try {
    const entries = await readdir(SIGNALS_DIR);
    return entries
      .filter((name) => name.startsWith("signal-") && name.endsWith(".json"))
      .map((name) => path.join(SIGNALS_DIR, name));
  } catch {
    return [];
  }
}

async function loadMatchTimeline(
  record: Pick<SignalOutcomeRecord, "matchId" | "externalId" | "homeTeam" | "awayTeam">
): Promise<MatchTimelineDocument | null> {
  const pseudoMatch = {
    id: record.matchId,
    externalId: record.externalId,
    homeTeam: record.homeTeam,
    awayTeam: record.awayTeam,
  } as Match;

  const filePath = path.join(MATCHES_DIR, buildMatchTimelineFilename(pseudoMatch));

  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as MatchTimelineDocument;
  } catch {
    return null;
  }
}

function getFinalScoreFromTimeline(
  timeline: MatchTimelineDocument
): { score: MatchScore; minute: number } | null {
  const last = timeline.timeline[timeline.timeline.length - 1];
  if (!last) return null;

  return {
    score: last.score ?? { home: 0, away: 0 },
    minute: last.minute,
  };
}

function findMatchForRecord(
  record: SignalOutcomeRecord,
  matches: Match[]
): Match | undefined {
  return matches.find(
    (m) => m.id === record.matchId || m.externalId === record.externalId
  );
}

async function resolveRecord(
  record: SignalOutcomeRecord,
  finalScore: MatchScore,
  resolutionMinute: number,
  resolvedAtMs: number,
  timeline?: MatchTimelineDocument | null
): Promise<SignalOutcomeRecord> {
  const goalsAtTrigger = record.metadata.goalsAtTrigger;
  const goalsAtResolution = totalGoals(finalScore);
  const { outcome, roi } = resolveMarketOutcome(
    record.market,
    goalsAtTrigger,
    goalsAtResolution,
    record.triggerOdds
  );

  const resolvedAt = new Date(resolvedAtMs).toISOString();
  const createdMs = new Date(record.createdAt).getTime();
  const timeToResolution = Math.max(
    0,
    Math.floor((resolvedAtMs - createdMs) / 1000)
  );

  const resolved: SignalOutcomeRecord = {
    ...record,
    status: "RESOLVED",
    outcome,
    roi,
    resolvedAt,
    resolutionMinute,
    timeToResolution,
    finalScore: { ...finalScore },
    metadata: {
      ...record.metadata,
      goalsAtResolution,
      newGoalsAfterSignal: Math.max(0, goalsAtResolution - goalsAtTrigger),
      lastUpdatedAt: resolvedAt,
      ...(timeline?.finishedAt
        ? { timelineFinishedAt: timeline.finishedAt }
        : {}),
    },
  };

  logInfo(LOG_SCOPE, "Signal resolved", {
    signalId: resolved.signalId,
    matchId: resolved.matchId,
    market: resolved.market,
    outcome: resolved.outcome,
    roi: resolved.roi,
    timeToResolutionSec: resolved.timeToResolution,
    goalsAtTrigger,
    goalsAtResolution,
    newGoals: resolved.metadata.newGoalsAfterSignal,
  });

  logInfo(LOG_SCOPE, "ROI calculated", {
    signalId: resolved.signalId,
    outcome: resolved.outcome,
    roi: resolved.roi,
    triggerOdds: resolved.triggerOdds,
  });

  return resolved;
}

async function updatePendingRecord(
  record: SignalOutcomeRecord,
  match: Match
): Promise<SignalOutcomeRecord> {
  const nowIso = new Date().toISOString();

  const updated: SignalOutcomeRecord = {
    ...record,
    status: "ACTIVE",
    metadata: {
      ...record.metadata,
      lastUpdatedAt: nowIso,
    },
  };

  logInfo(LOG_SCOPE, "Pending updated", {
    signalId: updated.signalId,
    matchId: updated.matchId,
    status: updated.status,
    minute: match.minute,
    pressure: match.pressure.score,
  });

  return updated;
}

async function isDuplicateSignal(
  signal: Signal,
  nowMs: number
): Promise<boolean> {
  const files = await listSignalFiles();
  const fingerprint = signalFingerprint(signal);

  for (const filePath of files) {
    const existing = await readSignalRecord(filePath);
    if (!existing || existing.status === "RESOLVED") continue;

    const existingFp = `${existing.matchId}|${existing.market}|${existing.confidence}`;
    if (existingFp !== fingerprint) continue;

    const createdMs = new Date(existing.createdAt).getTime();
    if (nowMs - createdMs < MIN_DUPLICATE_MS) {
      return true;
    }
  }

  return false;
}

async function processOpenSignals(
  matches: Match[],
  result: TrackSignalOutcomesResult
): Promise<void> {
  const files = await listSignalFiles();
  const nowMs = Date.now();

  for (const filePath of files) {
    const record = await readSignalRecord(filePath);
    if (!record || record.status === "RESOLVED") continue;

    const liveMatch = findMatchForRecord(record, matches);
    const timeline = await loadMatchTimeline(record);

    const finished =
      (liveMatch && isMatchFinished(liveMatch.status)) ||
      Boolean(timeline?.finishedAt);

    if (finished) {
      let finalScore: MatchScore = { home: 0, away: 0 };
      let resolutionMinute = record.triggerMinute;

      if (timeline) {
        const fromTimeline = getFinalScoreFromTimeline(timeline);
        if (fromTimeline) {
          finalScore = fromTimeline.score;
          resolutionMinute = fromTimeline.minute;
        }
      } else if (liveMatch?.score) {
        finalScore = { ...liveMatch.score };
        resolutionMinute = liveMatch.minute;
      }

      const resolved = await resolveRecord(
        record,
        finalScore,
        resolutionMinute,
        timeline?.finishedAt
          ? new Date(timeline.finishedAt).getTime()
          : nowMs,
        timeline
      );

      await writeFile(filePath, JSON.stringify(resolved, null, 2), "utf8");
      result.resolved += 1;

      const matchForRecord = findMatchForRecord(record, matches);
      void recordSignalOutcome(
        recordFromResolvedSignal(resolved, matchForRecord)
      );
      continue;
    }

    if (liveMatch) {
      const updated = await updatePendingRecord(record, liveMatch);
      await writeFile(filePath, JSON.stringify(updated, null, 2), "utf8");
      result.updated += 1;
    }
  }
}

async function createNewSignals(
  matches: Match[],
  signals: Signal[],
  meta: LiveMatchesApiMeta,
  result: TrackSignalOutcomesResult
): Promise<void> {
  const matchById = new Map(matches.map((m) => [m.id, m]));
  const nowMs = Date.now();

  for (const signal of signals) {
    const match = matchById.get(signal.matchId);
    if (!match) continue;

    if (await isDuplicateSignal(signal, nowMs)) {
      result.skippedDuplicate += 1;
      logInfo(LOG_SCOPE, "Duplicate skipped", {
        matchId: signal.matchId,
        market: signal.market,
        confidence: signal.confidence,
      });
      continue;
    }

    const record = createRecordFromSignal(match, signal, meta, nowMs);
    const filePath = path.join(
      SIGNALS_DIR,
      buildSignalOutcomeFilename(match.id, nowMs)
    );

    await writeFile(filePath, JSON.stringify(record, null, 2), "utf8");
    result.created += 1;

    logInfo(LOG_SCOPE, "Signal created", {
      signalId: record.signalId,
      matchId: record.matchId,
      market: record.market,
      confidence: record.confidence,
      triggerMinute: record.triggerMinute,
      triggerOdds: record.triggerOdds,
      file: path.basename(filePath),
    });
  }
}

/**
 * Tracks new signals and updates/resolves open records using live matches + timelines.
 */
export async function trackSignalOutcomes(
  matches: Match[],
  signals: Signal[],
  meta: LiveMatchesApiMeta
): Promise<TrackSignalOutcomesResult> {
  await ensureSignalsDir();

  const result: TrackSignalOutcomesResult = {
    created: 0,
    updated: 0,
    resolved: 0,
    skippedDuplicate: 0,
  };

  await processOpenSignals(matches, result);
  await createNewSignals(matches, signals, meta, result);

  if (result.created > 0 || result.updated > 0 || result.resolved > 0) {
    logInfo(LOG_SCOPE, "Signal outcome batch complete", {
      created: result.created,
      updated: result.updated,
      resolved: result.resolved,
      skippedDuplicate: result.skippedDuplicate,
    });
  }

  if (result.resolved > 0) {
    scheduleLearningFeedbackLoop();
  }

  return result;
}

export function trackSignalOutcomesAsync(
  matches: Match[],
  signals: Signal[],
  meta: LiveMatchesApiMeta
): void {
  void trackSignalOutcomes(matches, signals, meta).catch((error) => {
    const message = error instanceof Error ? error.message : "Unknown error";
    logWarn(LOG_SCOPE, "Signal outcome tracking failed", { message });
  });
}
