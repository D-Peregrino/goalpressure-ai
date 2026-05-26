import { readdir, readFile } from "fs/promises";
import path from "path";
import { loadHistoricalOutcomes } from "@/lib/engine/learning/loadHistoricalOutcomes";
import type { HistoricalSignalOutcome } from "@/lib/engine/learning/learning.types";
import type { MatchTimelineDocument } from "@/lib/storage/matchTimelineStorage";
import { BACKTEST_SCENARIOS } from "@/lib/backtesting/backtestScenarios";
import {
  evaluateHistoricalPoint,
  goalsAtMinuteFromTimeline,
  type EvaluatedBacktestPoint,
} from "@/lib/backtesting/backtestEvaluator";
import {
  aggregateScenarioMetrics,
  buildBacktestSnapshot,
  computeChaoticLeagueShare,
} from "@/lib/backtesting/backtestMetrics";
import type { ContextualBacktestSnapshot } from "@/lib/backtesting/backtest.types";
import { getBacktestConfig } from "@/lib/backtesting/backtestConfig";
import { logBacktestEvent } from "@/lib/backtesting/backtestLogger";
import { runSelfCalibration } from "@/lib/learning/selfCalibration";

const MATCHES_DIR = path.join(process.cwd(), "data", "matches");

async function loadLocalTimelines(): Promise<Map<string, MatchTimelineDocument>> {
  const map = new Map<string, MatchTimelineDocument>();
  try {
    const files = await readdir(MATCHES_DIR);
    for (const name of files) {
      if (!name.startsWith("match-") || !name.endsWith(".json")) continue;
      try {
        const raw = await readFile(path.join(MATCHES_DIR, name), "utf8");
        const doc = JSON.parse(raw) as MatchTimelineDocument;
        map.set(doc.externalId, doc);
        map.set(doc.matchId, doc);
      } catch {
        /* skip */
      }
    }
  } catch {
    /* empty */
  }
  return map;
}

function dedupeOutcomes(outcomes: HistoricalSignalOutcome[]): HistoricalSignalOutcome[] {
  const byKey = new Map<string, HistoricalSignalOutcome>();
  for (const o of outcomes) {
    const key = `${o.fixtureId}|${o.market}|${o.minute}|${o.createdAt}`;
    byKey.set(key, o);
  }
  return [...byKey.values()];
}

function sampleTimelineOutcomes(
  timelines: Map<string, MatchTimelineDocument>,
  limit: number
): HistoricalSignalOutcome[] {
  const synthetic: HistoricalSignalOutcome[] = [];
  for (const doc of timelines.values()) {
    if (!doc.finishedAt || doc.timeline.length < 4) continue;
    const step = Math.max(1, Math.floor(doc.timeline.length / 6));
    for (let i = step; i < doc.timeline.length; i += step) {
      const entry = doc.timeline[i]!;
      const pressure = entry.pressure?.score ?? 0;
      if (pressure < 55) continue;
      const final = doc.timeline[doc.timeline.length - 1]?.score;
      if (!final) continue;
      const goalsAt = goalsAtMinuteFromTimeline(doc, entry.minute) ?? 0;
      const finalTotal = final.home + final.away;
      const hit = finalTotal > goalsAt;
      synthetic.push({
        fixtureId: doc.externalId,
        signalType: "timeline_replay",
        market: "OVER_2_5",
        minute: entry.minute,
        pressureScore: pressure,
        evPercent: null,
        confidence: 55,
        confidenceClass: "MEDIUM",
        odd: entry.odds?.primary ?? 1.9,
        outcome: hit ? "HIT" : "MISS",
        finalScore: `${final.home}-${final.away}`,
        league: doc.league,
        homeTeam: doc.homeTeam,
        awayTeam: doc.awayTeam,
        temperature: null,
        createdAt: entry.timestamp,
      });
      if (synthetic.length >= limit) return synthetic;
    }
  }
  return synthetic;
}

export interface RunContextualBacktestResult {
  snapshot: ContextualBacktestSnapshot;
  pointsEvaluated: number;
}

/**
 * Executa backtest contextual sobre outcomes históricos + timelines locais.
 */
export async function runContextualBacktest(): Promise<RunContextualBacktestResult> {
  const config = getBacktestConfig();
  const timelines = await loadLocalTimelines();
  const outcomes = dedupeOutcomes(await loadHistoricalOutcomes());

  const timelineSamples = sampleTimelineOutcomes(
    timelines,
    Math.max(0, config.maxSamples - outcomes.length)
  );

  const dataset = [...outcomes, ...timelineSamples].slice(0, config.maxSamples);

  function evaluateDataset(
    scenario: (typeof BACKTEST_SCENARIOS)[0]
  ): EvaluatedBacktestPoint[] {
    return dataset.map((o) => {
      const timeline =
        timelines.get(o.fixtureId) ?? timelines.get(`sm-${o.fixtureId}`);
      const goalsAt =
        timeline != null ? goalsAtMinuteFromTimeline(timeline, o.minute) : undefined;
      return evaluateHistoricalPoint(o, scenario, goalsAt);
    });
  }

  const scenarios = BACKTEST_SCENARIOS.map((scenario) =>
    aggregateScenarioMetrics(scenario, evaluateDataset(scenario))
  );

  const moderateScenarioDef =
    BACKTEST_SCENARIOS.find((s) => s.id === "moderado") ?? BACKTEST_SCENARIOS[1]!;
  const moderatePoints = evaluateDataset(moderateScenarioDef);

  const chaoticShare = computeChaoticLeagueShare(moderatePoints);
  const moderateScenario = scenarios.find((s) => s.scenarioId === "moderado");

  let calibrationNote: string | null = null;
  if (config.enabled && !config.sandbox && moderateScenario && dataset.length >= 8) {
    runSelfCalibration({
      contextualAccuracyPct: moderateScenario.contextualAccuracyPct,
      predictiveAccuracyPct: moderateScenario.validAnticipationRate,
      falsePositivePct: moderateScenario.falsePositiveRate,
      chaoticLeagueShare: chaoticShare,
    });
    calibrationNote =
      "Thresholds recalibrados via AdaptiveLearningEngine com base no backtest moderado.";
  } else if (config.sandbox) {
    calibrationNote = "Modo sandbox — calibração simulada sem persistir thresholds.";
  }

  const snapshot = buildBacktestSnapshot({
    scenarios,
    points: moderatePoints,
    enabled: config.enabled,
    sandboxMode: config.sandbox,
    calibrationNote,
  });

  await logBacktestEvent({
    event: "backtest_complete",
    samples: dataset.length,
    timelines: timelines.size,
    validRate: snapshot.validAnticipationRate,
    falsePositiveRate: snapshot.falsePositiveRate,
    sandbox: config.sandbox,
  });

  return { snapshot, pointsEvaluated: dataset.length };
}
