import type { CollectiveContext } from "@/lib/network/network.types";
import type { OpsMetaConsensusSnapshot } from "@/types/opsApi";

export interface OpsBlendedConsensus {
  fixtureId: string;
  matchLabel: string;
  score: number;
  collectivePressure: number;
  observerCount: number;
  source: "network" | "meta" | "blended";
}

/** Combina consenso da rede com meta-consenso do runtime — leitura apenas. */
export function blendOpsConsensus(
  network: CollectiveContext[],
  meta: OpsMetaConsensusSnapshot | null
): OpsBlendedConsensus[] {
  const map = new Map<string, OpsBlendedConsensus>();

  for (const c of network) {
    map.set(c.fixtureId, {
      fixtureId: c.fixtureId,
      matchLabel: c.matchLabel,
      score: c.consensusScore,
      collectivePressure: c.collectivePressure,
      observerCount: c.observerCount,
      source: "network",
    });
  }

  for (const cell of meta?.consensusHeatmap ?? []) {
    const fid = String(cell.fixtureId ?? "");
    if (!fid) continue;
    const existing = map.get(fid);
    const metaScore = Number(cell.consensusScore ?? 0);
    if (existing) {
      map.set(fid, {
        ...existing,
        score: Math.round((existing.score + metaScore) / 2),
        source: "blended",
      });
    } else {
      map.set(fid, {
        fixtureId: fid,
        matchLabel: String(cell.matchLabel ?? `Jogo ${fid}`),
        score: Math.round(metaScore),
        collectivePressure: Math.round(metaScore * 0.85),
        observerCount: 0,
        source: "meta",
      });
    }
  }

  return [...map.values()].sort((a, b) => b.score - a.score);
}

export function aggregateConsensusScore(blended: OpsBlendedConsensus[]): number {
  if (!blended.length) return 0;
  return Math.round(
    blended.reduce((a, c) => a + c.score, 0) / blended.length
  );
}

export function aggregateCollectivePressure(blended: OpsBlendedConsensus[]): number {
  if (!blended.length) return 0;
  return Math.round(
    blended.reduce((a, c) => a + c.collectivePressure, 0) / blended.length
  );
}
