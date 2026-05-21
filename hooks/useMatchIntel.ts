"use client";

import { useMemo } from "react";
import { useLiveMatches } from "@/hooks/useLiveMatches";
import { useOps } from "@/hooks/useOps";

/** Aceita matchId (sm-xxx) ou fixtureId puro */
export function resolveFixtureId(id: string): string {
  return id.replace(/^sm-/, "");
}

export function useMatchIntel(idOrFixture: string) {
  const { matches, status: feedStatus } = useLiveMatches();
  const ops = useOps();

  const fixtureId = resolveFixtureId(idOrFixture);
  const matchId = idOrFixture.startsWith("sm-") ? idOrFixture : `sm-${fixtureId}`;

  const match = useMemo(
    () =>
      matches.find(
        (m) =>
          m.id === matchId ||
          m.externalId === fixtureId ||
          m.id === idOrFixture
      ),
    [matches, matchId, fixtureId, idOrFixture]
  );

  const pressure = useMemo(
    () =>
      ops.livePressure?.metrics.find((m) => m.fixtureId === fixtureId) ?? null,
    [ops.livePressure, fixtureId]
  );

  const meta = useMemo(
    () => ops.metaConsensus?.consensusHeatmap.find((c) => c.fixtureId === fixtureId),
    [ops.metaConsensus, fixtureId]
  );

  const temporal = useMemo(
    () => ops.temporal?.chaosMap.find((c) => c.fixtureId === fixtureId),
    [ops.temporal, fixtureId]
  );

  const microevent = useMemo(
    () => ops.microevent?.chaosBursts.find((c) => c.fixtureId === fixtureId),
    [ops.microevent, fixtureId]
  );

  const sequence = useMemo(
    () => ops.sequenceMemory?.sustainedChaos.find((c) => c.fixtureId === fixtureId),
    [ops.sequenceMemory, fixtureId]
  );

  const playerGk = useMemo(
    () =>
      ops.playerImpact?.goalkeeperResistance.find((c) => c.fixtureId === fixtureId),
    [ops.playerImpact, fixtureId]
  );

  const edges = useMemo(
    () =>
      (ops.marketCalibration?.topEdges ?? []).filter((e) => e.fixtureId === fixtureId),
    [ops.marketCalibration, fixtureId]
  );

  const activeSignal = useMemo(
    () =>
      ops.signalDecision?.activeSignals.find((s) => s.fixtureId === fixtureId),
    [ops.signalDecision, fixtureId]
  );

  return {
    match,
    matchId,
    fixtureId,
    pressure,
    meta,
    temporal,
    microevent,
    sequence,
    playerGk,
    edges,
    activeSignal,
    feedStatus,
    opsStatus: ops.status,
    lastUpdated: ops.lastUpdated,
  };
}
