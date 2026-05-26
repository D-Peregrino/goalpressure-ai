import { NextResponse } from "next/server";
import { isNetworkEngineEnabled } from "@/lib/network/networkConfig";
import { listSharedSignals } from "@/lib/network/signalExchange";
import { refreshCollectiveConsensus } from "@/lib/network/collectiveConsensus";
import { buildMarketConsensus } from "@/lib/network/marketConsensus";

export const dynamic = "force-dynamic";

/** GET /api/network/consensus — contexto coletivo e ligas quentes */
export async function GET() {
  if (!isNetworkEngineEnabled()) {
    return NextResponse.json({ ok: false, error: "network_desabilitado" }, { status: 503 });
  }

  const signals = await listSharedSignals();
  const consensus = await refreshCollectiveConsensus(signals);
  const market = buildMarketConsensus(consensus);

  return NextResponse.json({
    ok: true,
    consensus,
    hotLeagues: market.hotLeagues,
    emerging: market.emerging,
  });
}
