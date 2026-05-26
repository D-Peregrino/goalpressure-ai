import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireUser";
import { getTelegramDestinationById } from "@/lib/telegram/telegramDestinations";
import { sendTelegramMessageToChat } from "@/lib/telegram/telegramClient";
import { persistTelegramDispatchLog } from "@/lib/telegram/telegramDispatchLogPersistence";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { id } = await params;
  const dest = await getTelegramDestinationById(id);
  if (!dest) {
    return NextResponse.json({ error: "Destino não encontrado." }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as { message?: string };
  const text =
    body.message?.trim() ||
    `GoalPressure AI — teste de dispatch\nDestino: ${dest.name}\nTipo: ${dest.type}\nChat: ${dest.chat_id}`;

  const started = Date.now();
  const send = await sendTelegramMessageToChat(text, dest.chat_id, {
    source: "admin_test",
    signalId: `admin-test-${id}`,
  });
  const latencyMs = Date.now() - started;

  void persistTelegramDispatchLog({
    destinationId: dest.id,
    destinationName: dest.name,
    chatId: dest.chat_id,
    pipeline: "admin_test",
    alertType: "test",
    signalId: `admin-test-${id}`,
    status: send.sandbox ? "sandbox" : send.ok ? "sent" : "failed",
    errorMessage: send.error,
    messagePreview: text,
    telegramMessageId: send.messageId,
    latencyMs,
    tags: ["admin", "test"],
  });

  return NextResponse.json({
    ok: send.ok || send.sandbox,
    sandbox: send.sandbox,
    error: send.error,
    messageId: send.messageId,
    latencyMs,
  });
}
