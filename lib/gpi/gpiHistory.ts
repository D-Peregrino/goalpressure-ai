import type { GPIHistoryPoint } from "@/lib/gpi/gpi.types";

const MAX_POINTS = 48;
const historyByFixture = new Map<string, GPIHistoryPoint[]>();

export function pushGpiHistory(
  fixtureId: string,
  minute: number,
  score: number
): GPIHistoryPoint[] {
  const list = historyByFixture.get(fixtureId) ?? [];
  const last = list[list.length - 1];
  if (last && last.minute === minute && Math.abs(last.score - score) < 0.5) {
    return list;
  }

  list.push({
    minute,
    score,
    recordedAt: new Date().toISOString(),
  });

  if (list.length > MAX_POINTS) list.splice(0, list.length - MAX_POINTS);
  historyByFixture.set(fixtureId, list);
  return list;
}

export function getGpiHistory(fixtureId: string): GPIHistoryPoint[] {
  return [...(historyByFixture.get(fixtureId) ?? [])];
}

export function computeGpiTrend(fixtureId: string): {
  trend: import("@/lib/gpi/gpi.types").GPITrend;
  delta: number;
} {
  const list = historyByFixture.get(fixtureId) ?? [];
  if (list.length < 2) return { trend: "estavel", delta: 0 };

  const prev = list[list.length - 2]!;
  const cur = list[list.length - 1]!;
  const delta = Math.round((cur.score - prev.score) * 10) / 10;

  if (delta >= 6) return { trend: "subindo", delta };
  if (delta <= -6) return { trend: "caindo", delta };
  return { trend: "estavel", delta };
}

export function pruneGpiHistory(activeFixtureIds: Set<string>): void {
  for (const fid of historyByFixture.keys()) {
    if (!activeFixtureIds.has(fid)) historyByFixture.delete(fid);
  }
}

export function gpiHistoryFixtureCount(): number {
  return historyByFixture.size;
}
