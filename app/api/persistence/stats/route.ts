import { NextResponse } from "next/server";
import { getPersistenceStats } from "@/lib/persistence/persistenceObservability";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/persistence/stats — métricas agregadas de persistência contextual.
 */
export async function GET() {
  const stats = await getPersistenceStats();
  return NextResponse.json(stats);
}
