import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { addWatchlistItem, removeWatchlistItem } from "@/lib/workspace/operationalStore";
import type { WatchlistPriority } from "@/lib/workspace/operationalTypes";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "nao_autenticado" }, { status: 401 });
  }

  const body = (await request.json()) as {
    action?: "add" | "remove";
    fixtureId?: string;
    matchLabel?: string;
    note?: string;
    priority?: WatchlistPriority;
  };

  if (!body.fixtureId) {
    return NextResponse.json({ ok: false, error: "fixture_id_obrigatorio" }, { status: 400 });
  }

  if (body.action === "remove") {
    const result = await removeWatchlistItem(user.id, body.fixtureId);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 503 });
    }
    return NextResponse.json({ ok: true });
  }

  const result = await addWatchlistItem(user.id, {
    fixtureId: body.fixtureId,
    matchLabel: body.matchLabel,
    note: body.note,
    priority: body.priority,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 503 });
  }

  return NextResponse.json({ ok: true, item: result.item });
}

export async function DELETE(request: Request) {
  const user = await requireUser(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "nao_autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fixtureId = searchParams.get("fixtureId");
  if (!fixtureId) {
    return NextResponse.json({ ok: false, error: "fixture_id_obrigatorio" }, { status: 400 });
  }

  const result = await removeWatchlistItem(user.id, fixtureId);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
