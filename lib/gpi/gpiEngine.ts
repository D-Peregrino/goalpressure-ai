import type { Match } from "@/types/domain";
import { matchToContextMatch } from "@/lib/autonomous/matchContextBridge";
import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import { calculateGPI } from "@/lib/gpi/calculateGPI";
import { processGpiAlerts } from "@/lib/gpi/gpiAlertBridge";
import { getGpiConfig, isGpiEngineEnabled } from "@/lib/gpi/gpiConfig";
import { gpiHistoryFixtureCount, pruneGpiHistory } from "@/lib/gpi/gpiHistory";
import { logGpiEvent } from "@/lib/gpi/gpiLogger";
import { setGpiSnapshot } from "@/lib/gpi/gpiSnapshotStore";
import type { GPIEngineSnapshot, GPIResult } from "@/lib/gpi/gpi.types";

function isLive(match: Match): boolean {
  return match.status === "LIVE" || match.status === "HALFTIME";
}

/**
 * Ciclo GPI — consolida leituras sem alterar engines de origem.
 */
export async function runGPICycle(matches: Match[]): Promise<GPIEngineSnapshot> {
  const config = getGpiConfig();
  const live = matches.filter(isLive);
  const activeIds = new Set(
    live.map((m) => m.externalId ?? m.id.replace(/^sm-/, "") ?? m.id)
  );
  pruneGpiHistory(activeIds);

  const readings: GPIResult[] = [];
  let alertsTriggered = 0;

  if (config.enabled) {
    for (const match of live) {
      const enriched = matchToContextMatch(match) as EnrichedLiveMatch;
      const gpi = calculateGPI(enriched);
      readings.push(gpi);
      if (!config.sandbox) {
        alertsTriggered += await processGpiAlerts(match, gpi);
      }
    }
  }

  readings.sort((a, b) => b.score - a.score);

  const avgScore =
    readings.length > 0
      ? Math.round(readings.reduce((s, r) => s + r.score, 0) / readings.length)
      : 0;

  const snapshot: GPIEngineSnapshot = {
    generatedAt: new Date().toISOString(),
    enabled: config.enabled,
    sandboxMode: config.sandbox,
    readings: readings.slice(0, 32),
    topFixture: readings[0] ?? null,
    alertsTriggered,
    metrics: {
      fixturesTracked: gpiHistoryFixtureCount(),
      avgScore,
      highGpiCount: readings.filter((r) => r.score >= 85).length,
    },
  };

  setGpiSnapshot(snapshot);

  await logGpiEvent({
    event: "cycle_complete",
    readings: readings.length,
    avgScore,
    alertsTriggered,
    sandbox: config.sandbox,
  });

  return snapshot;
}

export { isGpiEngineEnabled };
