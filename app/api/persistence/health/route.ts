import { NextResponse } from "next/server";
import { getPersistenceHealth } from "@/lib/persistence/persistenceObservability";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/persistence/health — saúde operacional da persistência histórica.
 */
export async function GET() {
  const health = await getPersistenceHealth();
  const status =
    health.status === "unavailable" ? 503 : health.status === "degraded" ? 200 : 200;

  return NextResponse.json(health, { status });
}
