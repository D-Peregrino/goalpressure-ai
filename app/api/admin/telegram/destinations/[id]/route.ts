import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireUser";
import {
  deleteTelegramDestination,
  getTelegramDestinationById,
  updateTelegramDestination,
} from "@/lib/telegram/telegramDestinations";
import type { TelegramDestinationType } from "@/lib/telegram/telegramDestination.types";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json()) as {
    name?: string;
    type?: TelegramDestinationType;
    chat_id?: string;
    active?: boolean;
    tags?: string[];
  };

  if (body.type && !["user", "group", "channel"].includes(body.type)) {
    return NextResponse.json({ error: "type inválido." }, { status: 400 });
  }

  try {
    const destination = await updateTelegramDestination(id, body);
    if (!destination) {
      return NextResponse.json({ error: "Destino não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, destination });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao atualizar.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { id } = await params;
  const existing = await getTelegramDestinationById(id);
  if (!existing) {
    return NextResponse.json({ error: "Destino não encontrado." }, { status: 404 });
  }

  try {
    await deleteTelegramDestination(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao excluir.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
