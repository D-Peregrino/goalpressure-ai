import { NextResponse } from "next/server";
import {
  applySupabaseSessionCookies,
  clearSupabaseSessionCookies,
} from "@/lib/supabase/session-cookies";
import { getUserFromAccessToken } from "@/lib/supabase/server-auth";
import { devAuthEnabled } from "@/lib/auth/devStore";

export const dynamic = "force-dynamic";

/** POST — grava cookies de sessão (sync após login no browser). DELETE — limpa cookies. */
export async function POST(request: Request) {
  if (devAuthEnabled()) {
    return NextResponse.json({ ok: true, mode: "dev" });
  }

  const body = (await request.json()) as {
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
  };

  const accessToken = body.accessToken?.trim();
  const refreshToken = body.refreshToken?.trim();

  if (!accessToken || !refreshToken) {
    return NextResponse.json(
      { ok: false, error: "tokens_obrigatorios" },
      { status: 400 }
    );
  }

  const { user, error } = await getUserFromAccessToken(accessToken);
  if (error || !user) {
    return NextResponse.json(
      { ok: false, error: "token_invalido" },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ ok: true, userId: user.id });
  applySupabaseSessionCookies(response, {
    accessToken,
    refreshToken,
    expiresIn: body.expiresIn,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  return clearSupabaseSessionCookies(response);
}
