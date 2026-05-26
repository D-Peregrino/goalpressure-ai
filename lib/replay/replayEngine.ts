import type { ReplayTimelineEvent } from "@/lib/replay/replayTimeline";

export interface ReplaySnapshotPoint {
  fixtureId: string;
  minute: number;
  league: string;
  matchLabel: string;
  pressureScore: number;
  momentumScore: number;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  recordedAt: string;
}

export interface ReplayContextPoint {
  fixtureId: string;
  minute: number;
  contextScore: number;
  contextLevel: string;
  alertLevel: string | null;
  statusOperacional: string | null;
  narrative: string | null;
  recordedAt: string;
}

export interface ReplayPredictivePoint {
  fixtureId: string;
  minute: number;
  predictiveLevel: string;
  breakProbability: number;
  marketLagScore: number;
  goalPressureProbability: number;
  narrative: string | null;
  recordedAt: string;
}

export interface ReplayAlertPoint {
  fixtureId: string;
  minute: number;
  alertKind: string;
  priority: string;
  headline: string | null;
  narrative: string | null;
  contextScore: number;
  recordedAt: string;
}

export interface ReplayFrame {
  fixtureId: string;
  minute: number;
  snapshot: ReplaySnapshotPoint | null;
  context: ReplayContextPoint | null;
  predictive: ReplayPredictivePoint | null;
  alerts: ReplayAlertPoint[];
  timeline: ReplayTimelineEvent[];
  gpiScore: number;
  consensusScore: number;
  marketLagScore: number;
}

export interface ReplayDataset {
  fixtureId: string;
  matchLabel: string;
  league: string;
  minMinute: number;
  maxMinute: number;
  frames: ReplayFrame[];
  /** Replay local de demonstração — não vem do histórico persistido. */
  isDemo?: boolean;
}

function normalizeLabel(snapshot: ReplaySnapshotPoint | null, fixtureId: string): string {
  if (!snapshot) return `Jogo ${fixtureId}`;
  return snapshot.matchLabel;
}

function approxGpi(
  snapshot: ReplaySnapshotPoint | null,
  context: ReplayContextPoint | null,
  predictive: ReplayPredictivePoint | null
): number {
  const pressure = snapshot?.pressureScore ?? 0;
  const momentum = snapshot?.momentumScore ?? 0;
  const contextScore = context?.contextScore ?? 0;
  const breakProb = (predictive?.breakProbability ?? 0) * 100;
  return Math.round(
    Math.min(100, pressure * 0.4 + momentum * 0.15 + contextScore * 0.25 + breakProb * 0.2)
  );
}

function approxConsensus(
  context: ReplayContextPoint | null,
  predictive: ReplayPredictivePoint | null,
  timelineEvents: ReplayTimelineEvent[]
): number {
  const base = context?.contextScore ?? 0;
  const pred = (predictive?.goalPressureProbability ?? 0) * 100;
  const collectiveBoost = timelineEvents.filter((e) => e.kind === "consensus").length * 8;
  return Math.round(Math.min(100, base * 0.55 + pred * 0.25 + collectiveBoost));
}

export function buildReplayDataset(input: {
  fixtureId: string;
  snapshots: ReplaySnapshotPoint[];
  contexts: ReplayContextPoint[];
  predictive: ReplayPredictivePoint[];
  alerts: ReplayAlertPoint[];
  timeline: ReplayTimelineEvent[];
}): ReplayDataset | null {
  const { fixtureId, snapshots, contexts, predictive, alerts, timeline } = input;
  const minutes = new Set<number>();
  for (const s of snapshots) minutes.add(s.minute);
  for (const c of contexts) minutes.add(c.minute);
  for (const p of predictive) minutes.add(p.minute);
  for (const a of alerts) minutes.add(a.minute);
  for (const t of timeline) minutes.add(t.minute);

  if (!minutes.size) return null;

  const sortedMinutes = [...minutes].sort((a, b) => a - b);
  const minMinute = sortedMinutes[0] ?? 0;
  const maxMinute = sortedMinutes[sortedMinutes.length - 1] ?? 0;

  const snapshotByMinute = new Map(snapshots.map((x) => [x.minute, x]));
  const contextByMinute = new Map(contexts.map((x) => [x.minute, x]));
  const predictiveByMinute = new Map(predictive.map((x) => [x.minute, x]));

  const alertsByMinute = new Map<number, ReplayAlertPoint[]>();
  for (const alert of alerts) {
    const list = alertsByMinute.get(alert.minute) ?? [];
    list.push(alert);
    alertsByMinute.set(alert.minute, list);
  }

  const timelineByMinute = new Map<number, ReplayTimelineEvent[]>();
  for (const event of timeline) {
    const list = timelineByMinute.get(event.minute) ?? [];
    list.push(event);
    timelineByMinute.set(event.minute, list);
  }

  let carrySnapshot: ReplaySnapshotPoint | null = null;
  let carryContext: ReplayContextPoint | null = null;
  let carryPredictive: ReplayPredictivePoint | null = null;

  const frames: ReplayFrame[] = [];
  for (let minute = minMinute; minute <= maxMinute; minute += 1) {
    carrySnapshot = snapshotByMinute.get(minute) ?? carrySnapshot;
    carryContext = contextByMinute.get(minute) ?? carryContext;
    carryPredictive = predictiveByMinute.get(minute) ?? carryPredictive;
    const events = timelineByMinute.get(minute) ?? [];

    frames.push({
      fixtureId,
      minute,
      snapshot: carrySnapshot,
      context: carryContext,
      predictive: carryPredictive,
      alerts: alertsByMinute.get(minute) ?? [],
      timeline: events,
      gpiScore: approxGpi(carrySnapshot, carryContext, carryPredictive),
      consensusScore: approxConsensus(carryContext, carryPredictive, events),
      marketLagScore: Math.round((carryPredictive?.marketLagScore ?? 0) * 100),
    });
  }

  const labelSnapshot = snapshots[0] ?? null;
  return {
    fixtureId,
    matchLabel: normalizeLabel(labelSnapshot, fixtureId),
    league: labelSnapshot?.league ?? "Liga",
    minMinute,
    maxMinute,
    frames,
  };
}
