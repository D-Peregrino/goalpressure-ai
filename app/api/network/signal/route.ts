import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { postNetworkSignal } from "@/lib/network/networkEngine";
import { isNetworkEngineEnabled } from "@/lib/network/networkConfig";
import type { PostSignalInput } from "@/lib/network/network.types";

export const dynamic = "force-dynamic";

/** POST /api/network/signal — compartilhar leitura contextual */
export async function POST(request: Request) {
  if (!isNetworkEngineEnabled()) {
    return NextResponse.json({ ok: false, error: "network_desabilitado" }, { status: 503 });
  }

  const user = await requireUser(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "nao_autenticado" }, { status: 401 });
  }

  let body: PostSignalInput;
  try {
    body = (await request.json()) as PostSignalInput;
  } catch {
    return NextResponse.json({ ok: false, error: "json_invalido" }, { status: 400 });
  }

  if (!body.fixtureId || !body.matchLabel || !body.signalType || !body.body) {
    return NextResponse.json({ ok: false, error: "campos_obrigatorios" }, { status: 400 });
  }

  const displayName = user.name?.trim() || user.email.split("@")[0] || "Operador";
  const result = await postNetworkSignal(user.id, displayName, body);

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json({ ok: true, signal: result.signal });
}
