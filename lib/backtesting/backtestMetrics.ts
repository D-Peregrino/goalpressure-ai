import type {
  BacktestRankingEntry,
  BacktestScenarioResult,
  BacktestSimulationRow,
  BacktestTimelineEvent,
  ContextualBacktestSnapshot,
} from "@/lib/backtesting/backtest.types";
import type { BacktestScenarioThresholds } from "@/lib/backtesting/backtestScenarios";
import type { EvaluatedBacktestPoint } from "@/lib/backtesting/backtestEvaluator";

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function pct(num: number, den: number): number {
  if (den <= 0) return 0;
  return Math.round((num / den) * 1000) / 10;
}

function bucketMinute(minute: number): string {
  if (minute < 30) return "0-29";
  if (minute < 60) return "30-59";
  if (minute < 75) return "60-74";
  return "75+";
}

export function aggregateScenarioMetrics(
  scenario: BacktestScenarioThresholds,
  points: EvaluatedBacktestPoint[]
): BacktestScenarioResult {
  const actionable = points.filter(
    (p) => p.row.action !== "neutro" && p.row.action !== "monitoramento"
  );
  const valid = actionable.filter((p) => p.row.evaluation === "valido");
  const falsePos = actionable.filter((p) => p.row.evaluation === "falso_positivo");

  const timing = actionable
    .map((p) => p.row.minutesBeforeGoal)
    .filter((m): m is number => m != null);
  const marketDelays = actionable
    .map((p) => p.row.marketDelayMinutes)
    .filter((m): m is number => m != null);

  const contextualHits = points.filter(
    (p) => p.row.contextScore >= scenario.minContextScore && p.row.actualOutcome === "HIT"
  );

  return {
    scenarioId: scenario.id,
    scenarioLabel: scenario.label,
    validAnticipationRate: pct(valid.length, actionable.length || 1),
    falsePositiveRate: pct(falsePos.length, actionable.length || 1),
    contextualAccuracyPct: pct(contextualHits.length, points.length || 1),
    avgMinutesBeforeGoal:
      timing.length > 0
        ? round1(timing.reduce((a, b) => a + b, 0) / timing.length)
        : 0,
    avgMarketDelayMinutes:
      marketDelays.length > 0
        ? round1(marketDelays.reduce((a, b) => a + b, 0) / marketDelays.length)
        : 0,
    samples: points.length,
  };
}

function buildRankings(
  points: EvaluatedBacktestPoint[],
  keyFn: (p: EvaluatedBacktestPoint) => string,
  labelFn: (key: string, p: EvaluatedBacktestPoint) => string,
  limit = 5
): BacktestRankingEntry[] {
  const map = new Map<string, { hits: number; total: number; label: string }>();

  for (const p of points) {
    if (p.row.action === "neutro") continue;
    const key = keyFn(p);
    const cur = map.get(key) ?? { hits: 0, total: 0, label: labelFn(key, p) };
    cur.total += 1;
    if (p.row.evaluation === "valido") cur.hits += 1;
    map.set(key, cur);
  }

  return [...map.entries()]
    .filter(([, v]) => v.total >= 2)
    .map(([key, v]) => ({
      key,
      label: v.label,
      score: pct(v.hits, v.total),
      samples: v.total,
    }))
    .sort((a, b) => b.score - a.score || b.samples - a.samples)
    .slice(0, limit);
}

export function buildBacktestSnapshot(params: {
  scenarios: BacktestScenarioResult[];
  points: EvaluatedBacktestPoint[];
  enabled: boolean;
  sandboxMode: boolean;
  calibrationNote: string | null;
}): ContextualBacktestSnapshot {
  const { scenarios, points, enabled, sandboxMode, calibrationNote } = params;
  const moderate =
    scenarios.find((s) => s.scenarioId === "moderado") ?? scenarios[0];

  const actionable = points.filter(
    (p) => p.row.action !== "neutro" && p.row.action !== "monitoramento"
  );
  const valid = actionable.filter((p) => p.row.evaluation === "valido");
  const falsePos = actionable.filter((p) => p.row.evaluation === "falso_positivo");

  const timing = actionable
    .map((p) => p.row.minutesBeforeGoal)
    .filter((m): m is number => m != null);
  const marketDelays = actionable
    .map((p) => p.row.marketDelayMinutes)
    .filter((m): m is number => m != null);

  const timeline: BacktestTimelineEvent[] = points
    .filter((p) => p.row.action !== "neutro")
    .slice(0, 24)
    .map((p) => ({
      fixtureId: p.row.fixtureId,
      matchLabel: p.row.matchLabel,
      minute: p.row.minute,
      action: p.row.action,
      contextLevel: p.patternKey.split("|")[0] ?? "—",
      outcome: p.row.evaluation,
      goalsAfter:
        p.row.actualOutcome === "HIT"
          ? 1
          : 0,
    }));

  const recentSimulations: BacktestSimulationRow[] = points
    .slice(0, 12)
    .map((p) => p.row);

  return {
    generatedAt: new Date().toISOString(),
    enabled,
    sandboxMode,
    overallAccuracyPct: moderate?.contextualAccuracyPct ?? 0,
    validAnticipationRate: moderate?.validAnticipationRate ?? 0,
    falsePositiveRate: moderate?.falsePositiveRate ?? 0,
    avgMinutesBeforeGoal:
      timing.length > 0
        ? round1(timing.reduce((a, b) => a + b, 0) / timing.length)
        : moderate?.avgMinutesBeforeGoal ?? 0,
    avgMarketDelayMinutes:
      marketDelays.length > 0
        ? round1(marketDelays.reduce((a, b) => a + b, 0) / marketDelays.length)
        : moderate?.avgMarketDelayMinutes ?? 0,
    scenarios,
    topLeagues: buildRankings(
      points,
      (p) => p.row.league,
      (key) => key
    ),
    topPatterns: buildRankings(
      points,
      (p) => p.patternKey,
      (key) => key.replace("|", " · ")
    ),
    topContexts: buildRankings(
      points,
      (p) => p.contextLevel,
      (key) => key.replace(/_/g, " ")
    ),
    timeline,
    recentSimulations,
    calibrationNote,
  };
}

export function computeChaoticLeagueShare(points: EvaluatedBacktestPoint[]): number {
  const byLeague = new Map<string, { miss: number; total: number }>();
  for (const p of points) {
    const l = p.row.league;
    const cur = byLeague.get(l) ?? { miss: 0, total: 0 };
    cur.total += 1;
    if (p.row.actualOutcome === "MISS") cur.miss += 1;
    byLeague.set(l, cur);
  }
  let chaotic = 0;
  let leagues = 0;
  for (const v of byLeague.values()) {
    leagues += 1;
    if (v.total >= 3 && v.miss / v.total > 0.55) chaotic += 1;
  }
  return leagues > 0 ? chaotic / leagues : 0;
}

export function minuteEffectiveness(
  points: EvaluatedBacktestPoint[]
): BacktestRankingEntry[] {
  const map = new Map<string, { hits: number; total: number }>();
  for (const p of points) {
    if (p.row.action === "neutro") continue;
    const b = bucketMinute(p.row.minute);
    const cur = map.get(b) ?? { hits: 0, total: 0 };
    cur.total += 1;
    if (p.row.evaluation === "valido") cur.hits += 1;
    map.set(b, cur);
  }
  return [...map.entries()].map(([key, v]) => ({
    key,
    label: `${key}'`,
    score: pct(v.hits, v.total),
    samples: v.total,
  }));
}
