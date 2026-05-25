import { NextResponse } from "next/server";
import {
  consumePendingPushes,
  getDispatchSnapshot,
} from "@/lib/execution/dispatchSnapshotStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/execution/dispatch-feed — fila operacional e pushes pendentes.
 */
export async function GET() {
  const snapshot = getDispatchSnapshot();
  const pendingPushes = consumePendingPushes(12);

  return NextResponse.json({
    ok: true,
    snapshot,
    pendingPushes,
  });
}
