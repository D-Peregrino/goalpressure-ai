import { fetchLiveMatchesDirect } from "@/lib/live/fetchLiveMatchesDirect";
import { getGpiRecentAlerts, getGpiSnapshot } from "@/lib/gpi/gpiSnapshotStore";
import { buildNetworkFeed } from "@/lib/network/networkEngine";
import { buildMarketConsensus } from "@/lib/network/marketConsensus";
import { buildOpsApiPayload } from "@/lib/ops/opsSnapshot";
import { getOpsCenterConfig, isOpsCenterEnabled } from "@/lib/ops/opsCenterConfig";
import { seedOpsCenterSandbox } from "@/lib/ops/opsCenterDevStore";
import { logOpsCenterEvent } from "@/lib/ops/opsCenterLogger";
import {
  aggregateCollectivePressure,
  aggregateConsensusScore,
  blendOpsConsensus,
} from "@/lib/ops/opsConsensus";
import { computeMatchPriority, sortMatchesByPriority } from "@/lib/ops/opsPriority";
import { buildGlobalOpsTimeline } from "@/lib/ops/opsRealtimeFeed";
import type {
  MarketDistortionItem,
  OpsCenterPayload,
  OpsMatchSlot,
  OpsRadarCell,
  OpsTacticalReplayItem,
} from "@/lib/ops/opsCenter.types";
import type { Match } from "@/types/domain";
import { matchListLabel } from "@/lib/ux/hotMatches";

function fixtureIdOf(m: Match): string {
  return String(m.externalId ?? m.id);
}

function mapMatchToSlot(
  m: Match,
  ctx: {
    gpiByFixture: Map<string, number>;
    consensusByFixture: Map<string, { score: number; pressure: number; observers: number }>;
    edgeByFixture: Map<string, { ev: number; lag: boolean; ignored: boolean }>;
  }
): OpsMatchSlot {
  const fid = fixtureIdOf(m);
  const gpi = ctx.gpiByFixture.get(fid) ?? null;
  const cons = ctx.consensusByFixture.get(fid);
  const edge = ctx.edgeByFixture.get(fid);
  const isLive = m.status === "LIVE" || m.status === "HALFTIME";

  const base: OpsMatchSlot = {
    fixtureId: fid,
    matchLabel: matchListLabel(m),
    league: m.league,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    homeScore: m.score?.home ?? null,
    awayScore: m.score?.away ?? null,
    minute: m.minute ?? null,
    isLive,
    pressureScore: Math.round(m.pressure.score),
    gpiScore: gpi,
    consensusScore: cons?.score ?? null,
    priorityScore: 0,
    evContext: edge?.ev ?? null,
    oddsLag: edge?.lag ?? false,
    ignoredByMarket: edge?.ignored ?? false,
    homeLogoUrl: m.homeLogoUrl ?? null,
    awayLogoUrl: m.awayLogoUrl ?? null,
  };

  base.priorityScore = computeMatchPriority(base);
  return base;
}

function buildDistortions(
  marketTopEdges: {
    fixtureId: string;
    matchLabel?: string;
    market: string;
    edgePercent: number;
    expectedValue: number;
    classification: string;
    oddsDrift?: number;
    steamMove?: boolean;
  }[]
): MarketDistortionItem[] {
  return marketTopEdges.map((e) => ({
    fixtureId: e.fixtureId,
    matchLabel: e.matchLabel ?? e.fixtureId,
    market: e.market,
    edgePercent: e.edgePercent,
    ev: e.expectedValue,
    laggedOdds: Boolean(e.steamMove) || Math.abs(e.oddsDrift ?? 0) > 0.08,
    ignored: e.classification === "IGNORE",
    classification: e.classification,
  }));
}

function buildRadar(matches: OpsMatchSlot[], max: number): OpsRadarCell[] {
  return sortMatchesByPriority(matches)
    .slice(0, max)
    .map((m) => ({
      fixtureId: m.fixtureId,
      matchLabel: m.matchLabel,
      league: m.league,
      criticality: m.priorityScore,
      pressureScore: m.pressureScore,
      gpiScore: m.gpiScore,
      observerCount: 0,
      collectivePressure: m.consensusScore ?? m.pressureScore,
    }));
}

function buildTacticalReplay(
  sequenceOffensive: {
    fixtureId: string;
    matchLabel?: string;
    offensiveCycleStrength?: number;
  }[],
  temporalChaos: {
    fixtureId: string;
    matchLabel?: string;
    minute?: number;
    chaosIndex?: number;
  }[]
): OpsTacticalReplayItem[] {
  const items: OpsTacticalReplayItem[] = [];

  for (const o of sequenceOffensive.slice(0, 4)) {
    items.push({
      fixtureId: o.fixtureId,
      matchLabel: o.matchLabel ?? o.fixtureId,
      minute: 0,
      note: `Ciclo ofensivo · força ${Math.round(o.offensiveCycleStrength ?? 0)}`,
    });
  }

  for (const c of temporalChaos.slice(0, 3)) {
    items.push({
      fixtureId: c.fixtureId,
      matchLabel: c.matchLabel ?? c.fixtureId,
      minute: c.minute ?? 0,
      note: `Caos temporal ${Math.round(c.chaosIndex ?? 0)}`,
    });
  }

  return items.slice(0, 6);
}

/** Agrega fontes existentes sem modificar engines core. */
export async function buildOpsCenterPayload(): Promise<OpsCenterPayload | null> {
  if (!isOpsCenterEnabled()) return null;

  if (getOpsCenterConfig().sandbox) {
    return seedOpsCenterSandbox();
  }

  const [liveResult, opsPayload, networkFeed] = await Promise.all([
    fetchLiveMatchesDirect({ useCache: true, dispatchTelegram: false }),
    buildOpsApiPayload(0),
    buildNetworkFeed(),
  ]);

  const matches = liveResult.matches ?? [];
  const gpiSnap = getGpiSnapshot();
  const gpiByFixture = new Map<string, number>();
  for (const r of gpiSnap?.readings ?? []) {
    gpiByFixture.set(r.fixtureId, r.score);
  }

  const blended = blendOpsConsensus(
    networkFeed?.consensus ?? [],
    opsPayload.metaConsensus
  );
  const consensusByFixture = new Map(
    blended.map((c) => [
      c.fixtureId,
      { score: c.score, pressure: c.collectivePressure, observers: c.observerCount },
    ])
  );

  const edgeByFixture = new Map<string, { ev: number; lag: boolean; ignored: boolean }>();
  for (const e of opsPayload.marketCalibration.topEdges) {
    edgeByFixture.set(e.fixtureId, {
      ev: e.expectedValue,
      lag: Boolean(e.steamMove) || Math.abs(e.oddsDrift ?? 0) > 0.06,
      ignored: e.classification === "IGNORE",
    });
  }

  const slots = matches.map((m) =>
    mapMatchToSlot(m, { gpiByFixture, consensusByFixture, edgeByFixture })
  );

  for (const c of blended) {
    if (!slots.find((s) => s.fixtureId === c.fixtureId)) {
      slots.push({
        fixtureId: c.fixtureId,
        matchLabel: c.matchLabel,
        league: "—",
        homeTeam: "—",
        awayTeam: "—",
        homeScore: null,
        awayScore: null,
        minute: null,
        isLive: false,
        pressureScore: c.collectivePressure,
        gpiScore: gpiByFixture.get(c.fixtureId) ?? null,
        consensusScore: c.score,
        priorityScore: computeMatchPriority({
          pressureScore: c.collectivePressure,
          gpiScore: gpiByFixture.get(c.fixtureId) ?? null,
          consensusScore: c.score,
          evContext: null,
          oddsLag: false,
          fixtureId: c.fixtureId,
          isLive: false,
        }),
        evContext: null,
        oddsLag: false,
        ignoredByMarket: false,
      });
    }
  }

  const sorted = sortMatchesByPriority(slots);
  const radar = buildRadar(sorted, getOpsCenterConfig().maxRadar).map((r) => {
    const c = consensusByFixture.get(r.fixtureId);
    return { ...r, observerCount: c?.observers ?? 0, collectivePressure: c?.pressure ?? r.collectivePressure };
  });

  const market = buildMarketConsensus(networkFeed?.consensus ?? []);
  const timeline = buildGlobalOpsTimeline({
    gpiAlerts: getGpiRecentAlerts(),
    networkTimeline: networkFeed?.timeline ?? [],
    consensus: networkFeed?.consensus ?? [],
    telegramDispatches: opsPayload.recentDispatches,
    opsLogs: opsPayload.logs,
    matches,
  });

  const activeAlerts =
    (gpiSnap?.alertsTriggered ?? 0) +
    opsPayload.signalDecision.activeSignals.length +
    (networkFeed?.signals.length ?? 0);

  const payload: OpsCenterPayload = {
    hero: {
      monitoredMatches: sorted.filter((m) => m.isLive).length || sorted.length,
      activeAlerts,
      avgGpi: gpiSnap?.metrics.avgScore ?? 0,
      collectivePressure: aggregateCollectivePressure(blended),
      consensusScore: aggregateConsensusScore(blended),
    },
    matches: sorted,
    timeline,
    radar,
    distortions: buildDistortions(opsPayload.marketCalibration.topEdges),
    hotLeagues: market.hotLeagues,
    tacticalReplay: buildTacticalReplay(
      opsPayload.sequenceMemory.offensiveCycles,
      opsPayload.temporal.chaosMap
    ),
    sandbox: false,
    updatedAt: new Date().toISOString(),
  };

  await logOpsCenterEvent({
    event: "center_built",
    matches: payload.matches.length,
    timeline: payload.timeline.length,
  });

  return payload;
}
