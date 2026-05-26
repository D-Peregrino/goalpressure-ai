import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { addFavoriteLeague, removeFavoriteLeague } from "@/lib/workspace/operationalStore";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "nao_autenticado" }, { status: 401 });
  }

  const body = (await request.json()) as {
    action?: "add" | "remove";
    leagueId?: number;
    leagueName?: string;
    country?: string;
  };

  if (body.action === "remove") {
    if (body.leagueId == null) {
      return NextResponse.json({ ok: false, error: "league_id_obrigatorio" }, { status: 400 });
    }
    const result = await removeFavoriteLeague(user.id, body.leagueId);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 503 });
    }
    return NextResponse.json({ ok: true });
  }

  if (body.leagueId == null || !body.leagueName) {
    return NextResponse.json({ ok: false, error: "dados_invalidos" }, { status: 400 });
  }

  const result = await addFavoriteLeague(user.id, {
    leagueId: body.leagueId,
    leagueName: body.leagueName,
    country: body.country,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 503 });
  }

  return NextResponse.json({ ok: true, item: result.item });
}
