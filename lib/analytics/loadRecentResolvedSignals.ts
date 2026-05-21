import { readdir, readFile } from "fs/promises";
import path from "path";
import { MARKET_LABELS } from "@/types/domain";
import type { RecentResolvedSignalRow } from "@/types/analyticsApi";
import type { SignalOutcomeRecord } from "@/lib/storage/signalOutcomeStorage";

const SIGNALS_DIR = path.join(process.cwd(), "data", "signals");
const DEFAULT_LIMIT = 25;

export async function loadRecentResolvedSignals(
  limit = DEFAULT_LIMIT
): Promise<RecentResolvedSignalRow[]> {
  let files: string[] = [];

  try {
    const entries = await readdir(SIGNALS_DIR);
    files = entries
      .filter((name) => name.startsWith("signal-") && name.endsWith(".json"))
      .map((name) => path.join(SIGNALS_DIR, name));
  } catch {
    return [];
  }

  const resolved: SignalOutcomeRecord[] = [];

  for (const filePath of files) {
    try {
      const raw = await readFile(filePath, "utf8");
      const record = JSON.parse(raw) as SignalOutcomeRecord;
      if (record.status === "RESOLVED" && record.outcome && record.resolvedAt) {
        resolved.push(record);
      }
    } catch {
      // skip corrupt files
    }
  }

  resolved.sort(
    (a, b) =>
      new Date(b.resolvedAt!).getTime() - new Date(a.resolvedAt!).getTime()
  );

  return resolved.slice(0, limit).map((record) => ({
    signalId: record.signalId,
    matchLabel: `${record.homeTeam} vs ${record.awayTeam}`,
    market: record.market,
    marketLabel: MARKET_LABELS[record.market],
    confidence: record.confidence,
    odd: record.triggerOdds,
    pressure: record.triggerPressure,
    roi: record.roi ?? (record.outcome === "HIT" ? record.triggerOdds - 1 : -1),
    outcome: record.outcome!,
    timeToResolution: record.timeToResolution,
    resolvedAt: record.resolvedAt!,
  }));
}
