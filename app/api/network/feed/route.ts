import { NextResponse } from "next/server";
import { buildNetworkFeed } from "@/lib/network/networkEngine";
import { isNetworkEngineEnabled } from "@/lib/network/networkConfig";

export const dynamic = "force-dynamic";

/** GET /api/network/feed — sinais, consenso, timeline, heatmap e ranking */
export async function GET() {
  if (!isNetworkEngineEnabled()) {
    return NextResponse.json({ ok: false, error: "network_desabilitado" }, { status: 503 });
  }

  const feed = await buildNetworkFeed();
  if (!feed) {
    return NextResponse.json({ ok: false, error: "network_desabilitado" }, { status: 503 });
  }

  return NextResponse.json({ ok: true, feed });
}
