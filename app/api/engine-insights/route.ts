import { NextResponse } from "next/server";
import { getLatestEngineSnapshot } from "@/lib/engine/liveEnginePipeline";
import { getLiveDispatchQueueSize } from "@/lib/engine/telegram/liveDispatchQueue";
import type { LiveEngineSnapshot } from "@/types/engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export interface EngineInsightsApiResponse {
  ok: boolean;
  engine: LiveEngineSnapshot | null;
  dispatchQueueSize: number;
  fetchedAt: string;
}

export async function GET(): Promise<NextResponse<EngineInsightsApiResponse>> {
  const engine = getLatestEngineSnapshot();
  const snapshot = engine
    ? { ...engine, queueSize: getLiveDispatchQueueSize() }
    : null;

  return NextResponse.json({
    ok: true,
    engine: snapshot,
    dispatchQueueSize: getLiveDispatchQueueSize(),
    fetchedAt: new Date().toISOString(),
  });
}
