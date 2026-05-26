import { NextResponse } from "next/server";
import { listReplayFixtures, loadReplayRawData } from "@/lib/replay/replayLoader";
import { buildReplayTimeline } from "@/lib/replay/replayTimeline";
import { buildReplayDataset } from "@/lib/replay/replayEngine";

export const dynamic = "force-dynamic";

/** GET /api/replay — carrega partida e frames históricos para playback */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const fixtureIdParam = url.searchParams.get("fixtureId") ?? "";

  const fixtures = await listReplayFixtures();

  if (!fixtures.length && !fixtureIdParam) {
    return NextResponse.json({
      ok: true,
      fixtures: [],
      replay: null,
      empty: true,
      reason: "no_historical_snapshots",
      demoAvailable: true,
    });
  }

  const fixtureId = fixtureIdParam || fixtures[0]?.fixtureId;

  if (!fixtureId) {
    return NextResponse.json({
      ok: true,
      fixtures: [],
      replay: null,
      empty: true,
      reason: "no_historical_snapshots",
      demoAvailable: true,
    });
  }

  const raw = await loadReplayRawData(fixtureId);
  const kickOffAt =
    raw.snapshots[0]?.recordedAt ??
    raw.contexts[0]?.recordedAt ??
    raw.predictive[0]?.recordedAt ??
    new Date().toISOString();

  const timeline = buildReplayTimeline({
    fixtureId,
    kickOffAt,
    snapshots: raw.snapshots.map((s) => ({
      minute: s.minute,
      pressureScore: s.pressureScore,
      recordedAt: s.recordedAt,
    })),
    contexts: raw.contexts.map((c) => ({
      minute: c.minute,
      contextScore: c.contextScore,
      contextLevel: c.contextLevel,
      recordedAt: c.recordedAt,
    })),
    predictive: raw.predictive.map((p) => ({
      minute: p.minute,
      marketLagScore: p.marketLagScore,
      recordedAt: p.recordedAt,
    })),
    alerts: raw.alerts.map((a) => ({
      minute: a.minute,
      headline: a.headline,
      recordedAt: a.recordedAt,
    })),
    network: raw.network,
  });

  const replay = buildReplayDataset({
    fixtureId,
    snapshots: raw.snapshots,
    contexts: raw.contexts,
    predictive: raw.predictive,
    alerts: raw.alerts,
    timeline,
  });

  if (!replay) {
    return NextResponse.json({
      ok: true,
      fixtures,
      replay: null,
      empty: true,
      reason: "no_historical_snapshots",
      demoAvailable: true,
    });
  }

  return NextResponse.json({
    ok: true,
    fixtures,
    replay,
    empty: false,
    demoAvailable: true,
  });
}
