import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { saveWorkspacePreferences } from "@/lib/workspace/operationalStore";
import type { WorkspacePreferences } from "@/lib/workspace/operationalTypes";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const user = await requireUser(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "nao_autenticado" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<WorkspacePreferences>;
  const result = await saveWorkspacePreferences(user.id, body);

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 503 });
  }

  return NextResponse.json({ ok: true, preferences: result.preferences });
}
