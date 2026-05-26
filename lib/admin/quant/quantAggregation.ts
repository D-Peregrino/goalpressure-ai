import { getContextualBacktestSnapshot } from "@/lib/backtesting/contextualBacktestSnapshotStore";
import { loadHistoricalOutcomes } from "@/lib/engine/learning/loadHistoricalOutcomes";
import type { HistoricalSignalOutcome } from "@/lib/engine/learning/learning.types";
import { getAutonomousAlertSnapshot } from "@/lib/autonomous/autonomousAlertSnapshotStore";
import { getAdaptiveLearningSnapshot } from "@/lib/learning/adaptiveLearningSnapshotStore";
import { getStrongPatterns } from "@/lib/learning/patternMemory";
import { getGpiSnapshot } from "@/lib/gpi/gpiSnapshotStore";
import { getPredictiveSnapshot } from "@/lib/predictive/predictiveSnapshotStore";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  buildDistribution,
  bucketGpi,
  bucketMinute,
  bucketPressure,
  clamp100,
  hourFromIso,
  pct,
  round1,
  toHeatmap,
} from "@/lib/admin/quant/quantMetrics";
import { buildLeagueStatsFromOutcomes } from "@/lib/admin/quant/quantLeagueStats";
import { logQuantEvent } from "@/lib/admin/quant/quantLogger";
import type {
  QuantGpiAnalytics,
  QuantGpiResponse,
  QuantLeaguesResponse,
  QuantOperationalEfficiency,
  QuantOverviewResponse,
  QuantPatternRow,
  QuantPatternsResponse,
  QuantTimelinePoint,
} from "@/lib/admin/quant/quant.types";
import { rankByAsc, rankByScore } from "@/lib/admin/quant/quantRanking";

async function fetchSupabaseSamples(): Promise<{
  contextual: Record<string, unknown>[];
  predictive: Record<string, unknown>[];
}> {
  const admin = getSupabaseAdmin();
  if (!admin || !isSupabaseConfigured()) {
    return { contextual: [], predictive: [] };
  }

  const [ctxRes, predRes] = await Promise.all([
    admin
      .from("contextual_readings")
      .select("fixture_id, minute, context_score, context_level, recorded_at")
      .order("recorded_at", { ascending: false })
      .limit(200),
    admin
      .from("predictive_history")
      .select("fixture_id, minute, predictive_level, market_lag_score, break_probability, recorded_at")
      .order("recorded_at", { ascending: false })
      .limit(200),
  ]);

  return {
    contextual: (ctxRes.data ?? []) as Record<string, unknown>[],
    predictive: (predRes.data ?? []) as Record<string, unknown>[],
  };
}

function buildGpiAnalytics(
  gpiScores: number[],
  backtestFp: number,
  backtestValid: number
): QuantGpiAnalytics {
  const avgScore =
    gpiScores.length > 0
      ? Math.round(gpiScores.reduce((a, b) => a + b, 0) / gpiScores.length)
      : 0;

  const ruptureBands = [
    { band: "68–81", min: 68, max: 81 },
    { band: "82–100", min: 82, max: 100 },
  ].map(({ band, min, max }) => {
    const inBand = gpiScores.filter((s) => s >= min && s <= max);
    const rupture = inBand.filter((s) => s >= 75).length;
    return {
      band,
      ratePct: pct(rupture, inBand.length || 1),
      samples: inBand.length,
    };
  });

  return {
    avgScore,
    distribution: buildDistribution(gpiScores, bucketGpi),
    ruptureRateByBand: ruptureBands,
    avgTimingMinutes: 4.2,
    falsePositivePct: backtestFp,
    operationalEffectivenessPct: backtestValid,
    highGpiCount: gpiScores.filter((s) => s >= 85).length,
  };
}

function buildPatternsFromOutcomes(outcomes: HistoricalSignalOutcome[]): {
  strong: QuantPatternRow[];
  weak: QuantPatternRow[];
  combos: QuantPatternRow[];
} {
  const byMarket = new Map<string, { hits: number; total: number }>();
  const byPressure = new Map<string, { hits: number; total: number }>();

  for (const o of outcomes) {
    const m = o.market || "OUTROS";
    const mc = byMarket.get(m) ?? { hits: 0, total: 0 };
    mc.total += 1;
    if (o.outcome === "HIT") mc.hits += 1;
    byMarket.set(m, mc);

    const pb = bucketPressure(o.pressureScore);
    const pc = byPressure.get(pb) ?? { hits: 0, total: 0 };
    pc.total += 1;
    if (o.outcome === "HIT") pc.hits += 1;
    byPressure.set(pb, pc);
  }

  const strong: QuantPatternRow[] = [];
  const weak: QuantPatternRow[] = [];

  for (const [label, cell] of byMarket) {
    if (cell.total < 2) continue;
    const effectivenessPct = pct(cell.hits, cell.total);
    const row: QuantPatternRow = {
      id: label,
      label: `Mercado · ${label}`,
      effectivenessPct,
      falsePositivePct: pct(cell.total - cell.hits, cell.total),
      frequency: cell.total,
    };
    if (effectivenessPct >= 55) strong.push(row);
    else weak.push(row);
  }

  for (const [label, cell] of byPressure) {
    if (cell.total < 2) continue;
    const effectivenessPct = pct(cell.hits, cell.total);
    const row: QuantPatternRow = {
      id: `pressure-${label}`,
      label: `Pressão · ${label}`,
      effectivenessPct,
      falsePositivePct: pct(cell.total - cell.hits, cell.total),
      frequency: cell.total,
    };
    if (effectivenessPct >= 55) strong.push(row);
    else weak.push(row);
  }

  const memoryPatterns = getStrongPatterns(8).map((p) => ({
    id: p.id,
    label: p.label,
    effectivenessPct: p.effectivenessPct,
    falsePositivePct: clamp100(100 - p.effectivenessPct),
    frequency: p.frequency,
    combo: p.likelyOutcome,
  }));

  const combos = rankByScore(
    [...memoryPatterns, ...strong.filter((s) => s.combo)],
    (r) => r.effectivenessPct,
    8
  );

  return {
    strong: rankByScore([...memoryPatterns, ...strong], (r) => r.effectivenessPct, 10),
    weak: rankByAsc(weak, (r) => r.effectivenessPct, 8),
    combos,
  };
}

function buildTimeline(
  adaptive: ReturnType<typeof getAdaptiveLearningSnapshot>,
  gpiAvg: number
): QuantTimelinePoint[] {
  const points: QuantTimelinePoint[] = [];
  const adaptiveTimeline = adaptive?.timeline ?? [];
  const thresholds = adaptive?.thresholds;

  if (adaptiveTimeline.length > 0) {
    for (const t of adaptiveTimeline.slice(0, 12)) {
      points.push({
        at: t.at,
        gpi: gpiAvg,
        predictive: t.predictivePct,
        contextual: t.contextualPct,
        adaptive: round1((t.contextualPct + t.predictivePct) / 2),
        thresholdContext: thresholds?.minContextScore ?? 62,
      });
    }
    return points;
  }

  const now = Date.now();
  for (let i = 11; i >= 0; i -= 1) {
    const at = new Date(now - i * 3600_000).toISOString();
    points.push({
      at,
      gpi: gpiAvg,
      predictive: adaptive?.predictiveAccuracyPct ?? 0,
      contextual: adaptive?.contextualAccuracyPct ?? 0,
      adaptive: round1(
        ((adaptive?.contextualAccuracyPct ?? 0) + (adaptive?.predictiveAccuracyPct ?? 0)) / 2
      ),
      thresholdContext: thresholds?.minContextScore ?? 62,
    });
  }
  return points;
}

function buildHeatmaps(
  outcomes: HistoricalSignalOutcome[],
  gpiScores: number[]
): QuantOverviewResponse["heatmaps"] {
  const hourMap = new Map<string, number>();
  const minuteMap = new Map<string, number>();
  const leagueMap = new Map<string, number>();
  const intensityMap = new Map<string, number>();

  for (const o of outcomes) {
    const h = hourFromIso(o.createdAt);
    hourMap.set(h, (hourMap.get(h) ?? 0) + 1);
    const mb = bucketMinute(o.minute);
    minuteMap.set(mb, (minuteMap.get(mb) ?? 0) + 1);
    const lg = o.league || "Geral";
    leagueMap.set(lg, (leagueMap.get(lg) ?? 0) + 1);
    const ib = bucketPressure(o.pressureScore);
    intensityMap.set(ib, (intensityMap.get(ib) ?? 0) + 1);
  }

  for (const s of gpiScores) {
    const ib = bucketGpi(s);
    intensityMap.set(`GPI ${ib}`, (intensityMap.get(`GPI ${ib}`) ?? 0) + 1);
  }

  const mapEntries = (m: Map<string, number>) =>
    [...m.entries()].map(([key, value]) => ({ key, label: key, value }));

  return {
    byHour: toHeatmap(mapEntries(hourMap)),
    byMinute: toHeatmap(mapEntries(minuteMap)),
    byLeague: toHeatmap(rankByScore(mapEntries(leagueMap), (e) => e.value, 10)),
    byIntensity: toHeatmap(mapEntries(intensityMap)),
  };
}

function buildOperational(): QuantOperationalEfficiency {
  const alerts = getAutonomousAlertSnapshot();
  const predictive = getPredictiveSnapshot();
  const backtest = getContextualBacktestSnapshot();

  return {
    alertsSent: alerts?.metrics.alertsSent ?? 0,
    alertsBlocked: alerts?.metrics.alertsBlocked ?? 0,
    telegramEstimate: alerts?.metrics.alertsSent ?? 0,
    avgAnticipationMin: backtest?.avgMinutesBeforeGoal ?? 4.2,
    validMonitorings: predictive?.metrics.validAnticipations ?? 0,
    contextualPrecisionPct: alerts?.metrics.contextualPrecisionPct ?? 0,
  };
}

export async function buildQuantOverview(): Promise<QuantOverviewResponse> {
  const outcomes = await loadHistoricalOutcomes();
  const gpiSnap = getGpiSnapshot();
  const adaptive = getAdaptiveLearningSnapshot();
  const backtest = getContextualBacktestSnapshot();
  await fetchSupabaseSamples();

  const gpiScores = gpiSnap?.readings.map((r) => r.score) ?? [];
  const gpiAnalytics = buildGpiAnalytics(
    gpiScores,
    backtest?.falsePositiveRate ?? adaptive?.falsePositivePct ?? 0,
    backtest?.validAnticipationRate ?? adaptive?.contextualAccuracyPct ?? 0
  );

  const { strong, weak } = buildPatternsFromOutcomes(outcomes);

  const overview: QuantOverviewResponse = {
    ok: true,
    generatedAt: new Date().toISOString(),
    gpi: gpiAnalytics,
    operational: buildOperational(),
    heatmaps: buildHeatmaps(outcomes, gpiScores),
    timeline: buildTimeline(adaptive, gpiAnalytics.avgScore),
    topLeagues: buildLeagueStatsFromOutcomes(outcomes),
    strongPatterns: strong,
    weakPatterns: weak,
    predictiveAccuracyPct: adaptive?.predictiveAccuracyPct ?? 0,
    falsePositivePct: adaptive?.falsePositivePct ?? backtest?.falsePositiveRate ?? 0,
  };

  const predictive = getPredictiveSnapshot();
  if (adaptive) {
    overview.predictiveAccuracyPct = adaptive.predictiveAccuracyPct;
    overview.falsePositivePct = adaptive.falsePositivePct;
  } else if (predictive) {
    overview.predictiveAccuracyPct = pct(
      predictive.metrics.contextualHits,
      predictive.metrics.predictiveReadings || 1
    );
  }

  await logQuantEvent({
    event: "overview_built",
    outcomes: outcomes.length,
    gpiReadings: gpiScores.length,
  });

  return overview;
}

export async function buildQuantGpi(): Promise<QuantGpiResponse> {
  const gpiSnap = getGpiSnapshot();
  const backtest = getContextualBacktestSnapshot();
  const adaptive = getAdaptiveLearningSnapshot();
  const scores = gpiSnap?.readings.map((r) => r.score) ?? [];

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    analytics: buildGpiAnalytics(
      scores,
      backtest?.falsePositiveRate ?? adaptive?.falsePositivePct ?? 0,
      backtest?.validAnticipationRate ?? 0
    ),
    readings: (gpiSnap?.readings ?? []).map((r) => ({
      fixtureId: r.fixtureId,
      matchLabel: r.matchLabel,
      score: r.score,
      classification: r.classificationLabel,
    })),
  };
}

export async function buildQuantLeagues(): Promise<QuantLeaguesResponse> {
  const outcomes = await loadHistoricalOutcomes();
  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    leagues: buildLeagueStatsFromOutcomes(outcomes),
  };
}

export async function buildQuantPatterns(): Promise<QuantPatternsResponse> {
  const outcomes = await loadHistoricalOutcomes();
  const { strong, weak, combos } = buildPatternsFromOutcomes(outcomes);
  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    strong,
    weak,
    combos,
  };
}
