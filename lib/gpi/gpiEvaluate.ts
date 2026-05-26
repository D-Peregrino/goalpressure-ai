import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import { calculateGPI } from "@/lib/gpi/calculateGPI";
import type { GPIResult } from "@/lib/gpi/gpi.types";
import { getGpiSnapshot } from "@/lib/gpi/gpiSnapshotStore";

/** Leitura GPI client-safe (usa snapshot do servidor quando disponível). */
export function evaluateGpiFromEnriched(match: EnrichedLiveMatch): GPIResult {
  const cached = getGpiSnapshot()?.readings.find((r) => r.fixtureId === match.fixtureId);
  if (cached) return cached;
  return calculateGPI(match);
}

export function getGpiForFixture(fixtureId: string): GPIResult | null {
  return getGpiSnapshot()?.readings.find((r) => r.fixtureId === fixtureId) ?? null;
}
