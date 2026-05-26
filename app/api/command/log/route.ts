import { NextResponse } from "next/server";
import { logCommandEvent } from "@/lib/command/commandLogger";
import { isCommandSystemEnabled } from "@/lib/command/commandConfig";

export const dynamic = "force-dynamic";

/** POST /api/command/log — auditoria de comandos */
export async function POST(request: Request) {
  if (!isCommandSystemEnabled()) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    await logCommandEvent({ event: "command_executed", ...body });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
