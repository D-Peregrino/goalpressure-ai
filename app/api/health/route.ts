import { NextResponse } from "next/server";
import { runProductionHealthCheck } from "@/lib/system/healthEndpoint";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Liveness probe — must never return an opaque 500.
 * Railway/Docker hit this frequently; keep imports minimal (no live runtime bootstrap).
 */
export async function GET(): Promise<NextResponse> {
  try {
    const payload = await runProductionHealthCheck();

    return NextResponse.json(payload, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "health_check_failed";

    return NextResponse.json(
      {
        ok: false,
        status: "unhealthy",
        checks: {},
        errors: [message],
        timestamp: new Date().toISOString(),
        uptime: 0,
        environment: process.env.NODE_ENV ?? "unknown",
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}
