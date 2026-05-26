import { NextResponse } from "next/server";
import { getPersistenceRecent } from "@/lib/persistence/persistenceObservability";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/persistence/recent — últimas gravações por tabela.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(50, Math.max(5, Number(searchParams.get("limit") ?? 20)));

  const recent = await getPersistenceRecent(limit);
  return NextResponse.json(recent);
}
