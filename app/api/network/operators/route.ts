import { NextResponse } from "next/server";
import { isNetworkEngineEnabled } from "@/lib/network/networkConfig";
import { listSharedSignals } from "@/lib/network/signalExchange";
import { rebuildOperatorsFromSignals } from "@/lib/network/operatorProfiles";

export const dynamic = "force-dynamic";

/** GET /api/network/operators — leaderboard de operadores */
export async function GET() {
  if (!isNetworkEngineEnabled()) {
    return NextResponse.json({ ok: false, error: "network_desabilitado" }, { status: 503 });
  }

  const signals = await listSharedSignals();
  const operators = await rebuildOperatorsFromSignals(signals);

  return NextResponse.json({ ok: true, operators });
}
