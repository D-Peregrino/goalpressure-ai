import { NextResponse } from "next/server";
import { buildOpsCenterPayload } from "@/lib/ops/opsAggregation";
import { isOpsCenterEnabled } from "@/lib/ops/opsCenterConfig";

export const dynamic = "force-dynamic";

/** GET /api/ops/center — payload unificado do Live OPS Center */
export async function GET() {
  if (!isOpsCenterEnabled()) {
    return NextResponse.json({ ok: false, error: "ops_center_desabilitado" }, { status: 503 });
  }

  const center = await buildOpsCenterPayload();
  if (!center) {
    return NextResponse.json({ ok: false, error: "ops_center_desabilitado" }, { status: 503 });
  }

  return NextResponse.json({ ok: true, center });
}
