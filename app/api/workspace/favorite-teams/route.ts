import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { addFavoriteTeam, removeFavoriteTeam } from "@/lib/workspace/operationalStore";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "nao_autenticado" }, { status: 401 });
  }

  const body = (await request.json()) as {
    action?: "add" | "remove";
    teamId?: number;
    teamName?: string;
    logoPath?: string;
    leagueName?: string;
  };

  if (body.action === "remove") {
    if (body.teamId == null) {
      return NextResponse.json({ ok: false, error: "team_id_obrigatorio" }, { status: 400 });
    }
    const result = await removeFavoriteTeam(user.id, body.teamId);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 503 });
    }
    return NextResponse.json({ ok: true });
  }

  if (body.teamId == null || !body.teamName) {
    return NextResponse.json({ ok: false, error: "dados_invalidos" }, { status: 400 });
  }

  const result = await addFavoriteTeam(user.id, {
    teamId: body.teamId,
    teamName: body.teamName,
    logoPath: body.logoPath,
    leagueName: body.leagueName,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 503 });
  }

  return NextResponse.json({ ok: true, item: result.item });
}
