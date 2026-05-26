import type { LearningTimelinePoint } from "@/lib/learning/adaptiveLearning.types";

let contextualHits = 0;
let contextualTotal = 0;
let predictiveHits = 0;
let predictiveTotal = 0;
let validAnticipations = 0;
const timeline: LearningTimelinePoint[] = [];
const MAX_TIMELINE = 24;

function pct(hits: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((hits / total) * 1000) / 10;
}

export function ingestEngineLearningHitRate(hitRate: number, resolved: number): void {
  if (resolved <= 0) return;
  contextualTotal += resolved;
  contextualHits += Math.round((hitRate / 100) * resolved);
}

export function ingestPredictiveSnapshot(
  hits: number,
  readings: number,
  anticipations: number,
  falsePositives: number
): void {
  predictiveTotal += readings;
  predictiveHits += hits;
  validAnticipations += anticipations;
  contextualTotal += readings;
  contextualHits += Math.max(0, readings - falsePositives);
}

export function ingestDispatchContextual(feedCount: number, criticalCount: number): void {
  if (feedCount <= 0) return;
  contextualTotal += feedCount;
  contextualHits += Math.max(0, feedCount - Math.floor(criticalCount * 0.35));
}

export function pushTimelinePoint(): void {
  timeline.unshift({
    at: new Date().toISOString(),
    contextualPct: getContextualAccuracyPct(),
    predictivePct: getPredictiveAccuracyPct(),
  });
  if (timeline.length > MAX_TIMELINE) timeline.length = MAX_TIMELINE;
}

export function getContextualAccuracyPct(): number {
  return pct(contextualHits, contextualTotal);
}

export function getPredictiveAccuracyPct(): number {
  return pct(predictiveHits, predictiveTotal);
}

export function getValidAnticipations(): number {
  return validAnticipations;
}

export function getLearningTimeline(): LearningTimelinePoint[] {
  return [...timeline];
}

export function getReadingsRecorded(): number {
  return contextualTotal + predictiveTotal;
}
