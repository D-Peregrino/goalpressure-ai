import type {
  HistoricalSignalOutcome,
  SignalAccuracySummary,
} from "@/lib/engine/learning/learning.types";

function pressureBand(score: number): string {
  if (score >= 80) return "80+";
  if (score >= 70) return "70-79";
  if (score >= 60) return "60-69";
  return "<60";
}

function roiFor(o: HistoricalSignalOutcome): number {
  return o.outcome === "HIT" ? o.odd - 1 : -1;
}

/**
 * Mede taxa de acerto, ROI, EV realizado e precisão por segmento.
 */
export function calculateSignalAccuracy(
  outcomes: HistoricalSignalOutcome[]
): SignalAccuracySummary {
  const resolved = outcomes.filter(
    (o) => o.outcome === "HIT" || o.outcome === "MISS"
  );

  const emptyBucket = () => ({ hits: 0, total: 0, hitRate: 0, roi: 0 });
  const byMarket: SignalAccuracySummary["byMarket"] = {};
  const byPressureBand: SignalAccuracySummary["byPressureBand"] = {};
  const byTemperature: SignalAccuracySummary["byTemperature"] = {};

  let hits = 0;
  let roiTotal = 0;
  let evSum = 0;
  let evCount = 0;

  for (const o of resolved) {
    const r = roiFor(o);
    roiTotal += r;
    if (o.outcome === "HIT") hits += 1;
    if (o.evPercent != null) {
      evSum += o.evPercent;
      evCount += 1;
    }

    const mKey = o.market;
    if (!byMarket[mKey]) byMarket[mKey] = { ...emptyBucket(), hitRate: 0, roi: 0 };
    byMarket[mKey].total += 1;
    byMarket[mKey].roi += r;
    if (o.outcome === "HIT") byMarket[mKey].hits += 1;

    const pBand = pressureBand(o.pressureScore);
    if (!byPressureBand[pBand])
      byPressureBand[pBand] = { hits: 0, total: 0, hitRate: 0 };
    byPressureBand[pBand].total += 1;
    if (o.outcome === "HIT") byPressureBand[pBand].hits += 1;

    const tKey = o.temperature ?? "UNKNOWN";
    if (!byTemperature[tKey])
      byTemperature[tKey] = { hits: 0, total: 0, hitRate: 0 };
    byTemperature[tKey].total += 1;
    if (o.outcome === "HIT") byTemperature[tKey].hits += 1;
  }

  for (const b of Object.values(byMarket)) {
    b.hitRate = b.total > 0 ? Math.round((b.hits / b.total) * 1000) / 10 : 0;
  }
  for (const b of Object.values(byPressureBand)) {
    b.hitRate = b.total > 0 ? Math.round((b.hits / b.total) * 1000) / 10 : 0;
  }
  for (const b of Object.values(byTemperature)) {
    b.hitRate = b.total > 0 ? Math.round((b.hits / b.total) * 1000) / 10 : 0;
  }

  const total = resolved.length;
  return {
    totalResolved: total,
    hitRate: total > 0 ? Math.round((hits / total) * 1000) / 10 : 0,
    roiTotal: Math.round(roiTotal * 100) / 100,
    roiAverage: total > 0 ? Math.round((roiTotal / total) * 1000) / 1000 : 0,
    realizedEvAverage:
      evCount > 0 ? Math.round((evSum / evCount) * 10) / 10 : 0,
    byMarket,
    byPressureBand,
    byTemperature,
  };
}
