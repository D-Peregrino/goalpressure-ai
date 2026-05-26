import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { recordBehaviorEvent } from "@/lib/personalization/behaviorStore";
import type { BehaviorEventType } from "@/lib/personalization/types";
import { BEHAVIOR_EVENTS } from "@/lib/personalization/types";

export const dynamic = "force-dynamic";

/** POST /api/workspace/behavior — registra interação do usuário */
export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "nao_autenticado" }, { status: 401 });
  }

  const body = (await request.json()) as {
    eventType?: string;
    fixtureId?: string;
    leagueId?: number;
    teamId?: number;
    payload?: Record<string, unknown>;
  };

  if (!body.eventType || !BEHAVIOR_EVENTS.includes(body.eventType as BehaviorEventType)) {
    return NextResponse.json({ ok: false, error: "event_type_invalido" }, { status: 400 });
  }

  const result = await recordBehaviorEvent(user.id, {
    eventType: body.eventType as BehaviorEventType,
    fixtureId: body.fixtureId,
    leagueId: body.leagueId,
    teamId: body.teamId,
    payload: body.payload,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
