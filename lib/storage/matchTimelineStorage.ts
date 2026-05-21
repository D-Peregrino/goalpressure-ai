/**
 * Per-match persistent timeline storage (JSON files).
 * Builds continuous history from live API ticks for future backtests.
 */

import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { LiveMatchesApiMeta } from "@/types/api";
import type {
  Match,
  MatchScore,
  MatchStats,
  MatchStatus,
  Odds,
  PressureSnapshot,
  Signal,
} from "@/types/domain";
import { logInfo, logWarn } from "@/lib/utils/logger";

const LOG_SCOPE = "match-timeline-storage";
const MATCHES_DIR = path.join(process.cwd(), "data", "matches");
const MAX_TIMELINE_ENTRIES = 500;
const PRESSURE_DELTA_THRESHOLD = 2;

const FINISHED_STATUSES: MatchStatus[] = [
  "FINISHED",
  "CANCELLED",
  "POSTPONED",
];

export interface MatchTimelineEntry {
  timestamp: string;
  minute: number;
  score?: MatchScore;
  pressure: PressureSnapshot;
  stats: MatchStats;
  signals: Signal[];
  odds: Odds;
}

export interface MatchTimelineDocument {
  matchId: string;
  externalId: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  createdAt: string;
  updatedAt: string;
  finishedAt?: string;
  timeline: MatchTimelineEntry[];
}

export interface AppendMatchTimelineResult {
  created: number;
  appended: number;
  skippedDuplicate: number;
  finalized: number;
}

let ensureDirPromise: Promise<void> | null = null;

async function ensureMatchesDir(): Promise<void> {
  if (!ensureDirPromise) {
    ensureDirPromise = mkdir(MATCHES_DIR, { recursive: true }).then(() => undefined);
  }
  await ensureDirPromise;
}

function sanitizeExternalId(match: Match): string {
  const raw = match.externalId ?? match.id.replace(/^sm-/, "") ?? match.id;
  return raw.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function buildMatchTimelineFilename(match: Match): string {
  return `match-${sanitizeExternalId(match)}.json`;
}

function getMatchFilePath(match: Match): string {
  return path.join(MATCHES_DIR, buildMatchTimelineFilename(match));
}

function isMatchFinished(status?: MatchStatus): boolean {
  if (!status) return false;
  return FINISHED_STATUSES.includes(status);
}

function signalsForMatch(matchId: string, signals: Signal[]): Signal[] {
  return signals.filter((s) => s.matchId === matchId);
}

function signalsFingerprint(matchSignals: Signal[]): string {
  if (matchSignals.length === 0) return "";
  return matchSignals
    .map((s) => `${s.market}:${s.confidence}:${s.stake}`)
    .sort()
    .join("|");
}

function pressureChangedSignificantly(
  prev: PressureSnapshot,
  next: PressureSnapshot
): boolean {
  return Math.abs(prev.score - next.score) >= PRESSURE_DELTA_THRESHOLD;
}

function shouldAppendEntry(
  last: MatchTimelineEntry | undefined,
  next: MatchTimelineEntry
): boolean {
  if (!last) return true;

  if (last.minute !== next.minute) return true;

  if (pressureChangedSignificantly(last.pressure, next.pressure)) return true;

  if (signalsFingerprint(last.signals) !== signalsFingerprint(next.signals)) {
    return true;
  }

  return false;
}

function buildTimelineEntry(
  match: Match,
  matchSignals: Signal[],
  timestamp: string
): MatchTimelineEntry {
  return {
    timestamp,
    minute: match.minute,
    score: match.score ? { ...match.score } : undefined,
    pressure: { ...match.pressure },
    stats: { ...match.stats },
    signals: matchSignals.map((s) => ({ ...s })),
    odds: { ...match.odds },
  };
}

async function readTimelineDocument(
  filePath: string
): Promise<MatchTimelineDocument | null> {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as MatchTimelineDocument;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return null;
    }
    throw error;
  }
}

function createDocument(
  match: Match,
  entry: MatchTimelineEntry,
  nowIso: string
): MatchTimelineDocument {
  const externalId = sanitizeExternalId(match);

  return {
    matchId: match.id,
    externalId,
    league: match.league,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    createdAt: nowIso,
    updatedAt: nowIso,
    timeline: [entry],
  };
}

function trimTimeline(timeline: MatchTimelineEntry[]): MatchTimelineEntry[] {
  if (timeline.length <= MAX_TIMELINE_ENTRIES) return timeline;
  return timeline.slice(timeline.length - MAX_TIMELINE_ENTRIES);
}

interface PersistMatchOutcome {
  action: "created" | "appended" | "skipped";
  finalized: boolean;
}

async function persistMatchTimeline(
  match: Match,
  allSignals: Signal[],
  nowIso: string
): Promise<PersistMatchOutcome> {
  await ensureMatchesDir();

  const filePath = getMatchFilePath(match);
  const matchSignals = signalsForMatch(match.id, allSignals);
  const entry = buildTimelineEntry(match, matchSignals, nowIso);

  let doc = await readTimelineDocument(filePath);
  let action: PersistMatchOutcome["action"] = "skipped";

  if (!doc) {
    doc = createDocument(match, entry, nowIso);
    action = "created";
    logInfo(LOG_SCOPE, "Match timeline created", {
      matchId: match.id,
      externalId: doc.externalId,
      file: buildMatchTimelineFilename(match),
      league: match.league,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
    });
  } else {
    doc.league = match.league;
    doc.homeTeam = match.homeTeam;
    doc.awayTeam = match.awayTeam;
    doc.updatedAt = nowIso;

    const last = doc.timeline[doc.timeline.length - 1];

    if (shouldAppendEntry(last, entry)) {
      doc.timeline.push(entry);
      doc.timeline = trimTimeline(doc.timeline);
      action = "appended";
      logInfo(LOG_SCOPE, "Timeline appended", {
        matchId: match.id,
        externalId: doc.externalId,
        minute: entry.minute,
        pressureScore: entry.pressure.score,
        signalCount: matchSignals.length,
        timelineSize: doc.timeline.length,
      });
    } else {
      logInfo(LOG_SCOPE, "Duplicate skipped", {
        matchId: match.id,
        externalId: doc.externalId,
        minute: match.minute,
        pressureScore: match.pressure.score,
      });
    }
  }

  let finalized = false;

  if (isMatchFinished(match.status) && !doc.finishedAt) {
    doc.finishedAt = nowIso;
    finalized = true;
    logInfo(LOG_SCOPE, "Match finalized", {
      matchId: match.id,
      externalId: doc.externalId,
      status: match.status,
      timelineSize: doc.timeline.length,
    });
  }

  await writeFile(filePath, JSON.stringify(doc, null, 2), "utf8");

  return { action, finalized };
}

/**
 * Appends timeline entries for each match when material change is detected.
 */
export async function appendMatchTimeline(
  matches: Match[],
  signals: Signal[],
  _meta: LiveMatchesApiMeta
): Promise<AppendMatchTimelineResult> {
  const nowIso = new Date().toISOString();
  const result: AppendMatchTimelineResult = {
    created: 0,
    appended: 0,
    skippedDuplicate: 0,
    finalized: 0,
  };

  if (matches.length === 0) {
    return result;
  }

  for (const match of matches) {
    try {
      const { action, finalized } = await persistMatchTimeline(
        match,
        signals,
        nowIso
      );

      if (action === "created") result.created += 1;
      if (action === "appended") result.appended += 1;
      if (action === "skipped") result.skippedDuplicate += 1;
      if (finalized) result.finalized += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      logWarn(LOG_SCOPE, "Failed to persist match timeline", {
        matchId: match.id,
        message,
      });
    }
  }

  if (result.created > 0 || result.appended > 0 || result.finalized > 0) {
    logInfo(LOG_SCOPE, "Match timeline batch complete", {
      created: result.created,
      appended: result.appended,
      skippedDuplicate: result.skippedDuplicate,
      finalized: result.finalized,
    });
  }

  return result;
}

/** Fire-and-forget — does not block API responses. */
export function appendMatchTimelineAsync(
  matches: Match[],
  signals: Signal[],
  meta: LiveMatchesApiMeta
): void {
  void appendMatchTimeline(matches, signals, meta).catch((error) => {
    const message = error instanceof Error ? error.message : "Unknown error";
    logWarn(LOG_SCOPE, "Match timeline batch failed", { message });
  });
}
