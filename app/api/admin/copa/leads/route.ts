import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireUser";
import { fetchCopaLeads } from "@/lib/copa/copaLeadsDb";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const leads = await fetchCopaLeads();
  return NextResponse.json({ ok: true, leads });
}
