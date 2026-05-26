import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireUser";
import {
  createTelegramDestination,
  listTelegramDestinations,
} from "@/lib/telegram/telegramDestinations";
import type { TelegramDestinationType } from "@/lib/telegram/telegramDestination.types";
import { isTelegramRoutingConfigured } from "@/lib/telegram/telegramRouting";
import { isTelegramSandboxMode } from "@/lib/telegram/telegramClient";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const destinations = await listTelegramDestinations();
  const routingConfigured = await isTelegramRoutingConfigured();

  return NextResponse.json({
    ok: true,
    destinations,
    sandbox: isTelegramSandboxMode(),
    routingConfigured,
  });
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const body = (await request.json()) as {
    name?: string;
    type?: TelegramDestinationType;
    chat_id?: string;
    active?: boolean;
    tags?: string[];
  };

  if (!body.name?.trim() || !body.chat_id?.trim() || !body.type) {
    return NextResponse.json(
      { error: "name, type e chat_id são obrigatórios." },
      { status: 400 }
    );
  }

  if (!["user", "group", "channel"].includes(body.type)) {
    return NextResponse.json({ error: "type inválido." }, { status: 400 });
  }

  try {
    const destination = await createTelegramDestination({
      name: body.name,
      type: body.type,
      chat_id: body.chat_id,
      active: body.active ?? true,
      tags: body.tags,
    });
    return NextResponse.json({ ok: true, destination });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao criar destino.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
