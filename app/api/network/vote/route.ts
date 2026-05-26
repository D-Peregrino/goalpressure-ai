import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { postNetworkVote } from "@/lib/network/networkEngine";
import { isNetworkEngineEnabled } from "@/lib/network/networkConfig";
import type { PostVoteInput } from "@/lib/network/network.types";

export const dynamic = "force-dynamic";

/** POST /api/network/vote — validar ou sinalizar utilidade */
export async function POST(request: Request) {
  if (!isNetworkEngineEnabled()) {
    return NextResponse.json({ ok: false, error: "network_desabilitado" }, { status: 503 });
  }

  const user = await requireUser(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "nao_autenticado" }, { status: 401 });
  }

  let body: PostVoteInput;
  try {
    body = (await request.json()) as PostVoteInput;
  } catch {
    return NextResponse.json({ ok: false, error: "json_invalido" }, { status: 400 });
  }

  if (!body.signalId || !body.vote) {
    return NextResponse.json({ ok: false, error: "campos_obrigatorios" }, { status: 400 });
  }

  const result = await postNetworkVote(user.id, body);
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
