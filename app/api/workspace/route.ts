import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { getWorkspaceForUser } from "@/lib/workspace/serverStore";
import {
  getOperationalWorkspace,
  syncAlertsFromBlob,
} from "@/lib/workspace/operationalStore";

export const dynamic = "force-dynamic";

/** GET /api/workspace — payload operacional + blob legado */
export async function GET(request: Request) {
  const user = await requireUser(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "nao_autenticado" }, { status: 401 });
  }

  const blob = await getWorkspaceForUser(user.id);
  if (blob?.recentAlerts?.length) {
    await syncAlertsFromBlob(user.id, blob.recentAlerts);
  }

  const operational = await getOperationalWorkspace(user.id);

  return NextResponse.json({
    ok: true,
    operational,
    legacy: blob
      ? {
          favorites: blob.favorites,
          watched: blob.watched,
          readingHistory: blob.readingHistory,
          recentOpportunities: blob.recentOpportunities,
          recentAlerts: blob.recentAlerts,
        }
      : null,
  });
}
