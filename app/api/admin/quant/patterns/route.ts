import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireUser";
import { buildQuantPatterns } from "@/lib/admin/quant/quantAggregation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Acesso negado" }, { status: 403 });
  }

  const data = await buildQuantPatterns();
  return NextResponse.json(data);
}
