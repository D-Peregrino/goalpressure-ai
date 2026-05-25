import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { getWorkspaceForUser, saveWorkspaceForUser } from "@/lib/workspace/serverStore";
import { EMPTY_WORKSPACE, type UserWorkspaceData } from "@/lib/workspace/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (!user) {
    return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
  }

  const workspace = await getWorkspaceForUser(user.id);
  if (!workspace) {
    return NextResponse.json({ ok: true, workspace: null, mode: "local_only" });
  }

  return NextResponse.json({ ok: true, workspace });
}

export async function PUT(request: Request) {
  const user = await requireUser(request);
  if (!user) {
    return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<UserWorkspaceData>;
  const current = (await getWorkspaceForUser(user.id)) ?? EMPTY_WORKSPACE;

  const next: UserWorkspaceData = {
    favorites: body.favorites ?? current.favorites,
    watched: body.watched ?? current.watched,
    readingHistory: body.readingHistory ?? current.readingHistory,
    recentOpportunities: body.recentOpportunities ?? current.recentOpportunities,
    savedOpportunities: body.savedOpportunities ?? current.savedOpportunities,
    recentAlerts: body.recentAlerts ?? current.recentAlerts,
    activityLog: body.activityLog ?? current.activityLog,
    onboardingCompleted: body.onboardingCompleted ?? current.onboardingCompleted,
    spotlightCompleted: body.spotlightCompleted ?? current.spotlightCompleted,
    lastRoute: body.lastRoute ?? current.lastRoute,
  };

  const result = await saveWorkspaceForUser(user.id, next);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error ?? "Falha ao salvar workspace." },
      { status: 503 }
    );
  }

  return NextResponse.json({ ok: true, workspace: next });
}
