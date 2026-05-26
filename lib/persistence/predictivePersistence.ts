import { getPredictiveSnapshot } from "@/lib/predictive/predictiveSnapshotStore";
import { batchUpsertIgnoreDuplicates } from "@/lib/persistence/persistenceBatch";
import { getPersistenceConfig } from "@/lib/persistence/persistenceConfig";
import { shouldPersistFixtureMinute } from "@/lib/persistence/persistenceThrottle";

export function buildPredictiveHistoryRows(): Record<string, unknown>[] {
  const config = getPersistenceConfig();
  const snapshot = getPredictiveSnapshot();
  if (!snapshot?.readings.length) return [];

  const rows: Record<string, unknown>[] = [];
  for (const reading of snapshot.readings) {
    const minute = Math.max(0, reading.minute);
    if (
      !shouldPersistFixtureMinute(
        "predictive",
        reading.fixtureId,
        minute,
        config.fixtureMinIntervalMs
      )
    ) {
      continue;
    }

    rows.push({
      fixture_id: reading.fixtureId,
      minute,
      predictive_level: reading.level,
      break_probability: reading.contextualBreakProbability,
      market_lag_score: reading.marketLagScore,
      goal_pressure_probability: reading.goalPressureProbability,
      narrative: reading.narrative.slice(0, 1200),
      metadata_json: {
        offensiveAcceleration: reading.offensiveAcceleration,
        ruptureRisk: reading.ruptureRisk,
        prePressureActive: reading.prePressureActive,
        marketLagActive: reading.marketLagActive,
      },
    });
  }

  return rows;
}

export async function persistPredictiveHistory(): Promise<number> {
  const config = getPersistenceConfig();
  if (config.sandbox) return 0;

  const rows = buildPredictiveHistoryRows();
  return batchUpsertIgnoreDuplicates(
    "predictive_history",
    rows,
    "fixture_id,minute",
    config.batchSize
  );
}
