import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { fetchLiveMatchesDirect } from "@/lib/live/fetchLiveMatchesDirect";
import { getOperationalWorkspace } from "@/lib/workspace/operationalStore";
import { getWorkspaceForUser } from "@/lib/workspace/serverStore";
import {
  getOperationalProfile,
  getRecentBehaviorEvents,
  saveOperationalProfile,
} from "@/lib/personalization/behaviorStore";
import { buildSmartWorkspacePayload } from "@/lib/personalization/profileEngine";
import type { AlertHistoryItem } from "@/lib/workspace/operationalTypes";

export const dynamic = "force-dynamic";

/** GET /api/workspace/smart — perfil, recomendações e alertas personalizados */
export async function GET(request: Request) {
  const user = await requireUser(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "nao_autenticado" }, { status: 401 });
  }

  const [events, existingProfile, operational, blob, liveResult] = await Promise.all([
    getRecentBehaviorEvents(user.id),
    getOperationalProfile(user.id),
    getOperationalWorkspace(user.id),
    getWorkspaceForUser(user.id),
    fetchLiveMatchesDirect(),
  ]);

  const alerts: AlertHistoryItem[] = operational.alertHistory;
  const legacyAlerts =
    blob?.recentAlerts?.map((a) => ({
      id: a.id,
      fixtureId: a.fixtureId,
      matchLabel: a.label,
      alertType: "workspace",
      message: a.message,
      severity: "medium" as const,
      readAt: null,
      createdAt: new Date(a.ts).toISOString(),
    })) ?? [];

  const mergedAlerts = [...alerts];
  for (const la of legacyAlerts) {
    if (!mergedAlerts.some((x) => x.id === la.id)) mergedAlerts.push(la);
  }

  const smart = buildSmartWorkspacePayload({
    userId: user.id,
    events,
    existingProfile,
    favoriteLeagueIds: operational.favoriteLeagues.map((l) => l.leagueId),
    favoriteTeamIds: operational.favoriteTeams.map((t) => t.teamId),
    watchlistFixtureIds: operational.watchlist.map((w) => w.fixtureId),
    favoriteFixtureIds: blob?.favorites ?? [],
    liveMatches: liveResult.matches,
    alerts: mergedAlerts,
  });

  await saveOperationalProfile(smart.profile);

  return NextResponse.json({ ok: true, smart });
}
