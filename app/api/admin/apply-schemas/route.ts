import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireUser";
import { applyAllSchemas } from "@/lib/system/applyAllSchemas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/admin/apply-schemas — aplica schemas SQL (admin).
 */
export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Acesso negado." }, { status: 403 });
  }

  const result = await applyAllSchemas();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
