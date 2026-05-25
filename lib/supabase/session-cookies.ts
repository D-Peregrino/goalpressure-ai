import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSupabaseProjectRef } from "@/lib/supabase/env";
import { SB_ACCESS_COOKIE, SB_REFRESH_COOKIE } from "@/lib/supabase/session-cookie-names";

export { SB_ACCESS_COOKIE, SB_REFRESH_COOKIE };

export type SessionTokens = {
  accessToken: string;
  refreshToken: string;
  /** Segundos até expirar o access token (padrão 1 h). */
  expiresIn?: number;
};

type ResponseCookies = NextResponse["cookies"];

function cookieOpts(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge,
  };
}

function writeTokensToCookies(
  jar: ResponseCookies,
  tokens: SessionTokens
): void {
  const accessMaxAge = tokens.expiresIn ?? 60 * 60;
  const refreshMaxAge = 60 * 60 * 24 * 30;

  jar.set(SB_ACCESS_COOKIE, tokens.accessToken, cookieOpts(accessMaxAge));
  jar.set(SB_REFRESH_COOKIE, tokens.refreshToken, cookieOpts(refreshMaxAge));

  const ref = getSupabaseProjectRef();
  if (ref) {
    const payload = JSON.stringify({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      token_type: "bearer",
    });
    jar.set(`sb-${ref}-auth-token`, payload, cookieOpts(accessMaxAge));
  }
}

/**
 * Define cookies na resposta HTTP — obrigatório no App Router.
 * cookies().set() sozinho não anexa Set-Cookie ao NextResponse.json().
 */
export function applySupabaseSessionCookies(
  response: NextResponse,
  tokens: SessionTokens
): NextResponse {
  writeTokensToCookies(response.cookies, tokens);
  return response;
}

export function clearSupabaseSessionCookies(response: NextResponse): NextResponse {
  response.cookies.delete(SB_ACCESS_COOKIE);
  response.cookies.delete(SB_REFRESH_COOKIE);
  const ref = getSupabaseProjectRef();
  if (ref) {
    response.cookies.delete(`sb-${ref}-auth-token`);
  }
  return response;
}

/** Lê access token: Authorization Bearer → cookies da requisição. */
export async function getAccessTokenFromRequest(
  request?: Request | NextRequest
): Promise<string | null> {
  const bearer = request?.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();
  if (bearer) return bearer;

  const store = await cookies();
  const direct = store.get(SB_ACCESS_COOKIE)?.value;
  if (direct) return direct;

  const ref = getSupabaseProjectRef();
  if (ref) {
    const raw = store.get(`sb-${ref}-auth-token`)?.value;
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as {
          access_token?: string;
          currentSession?: { access_token?: string };
        };
        return parsed.access_token ?? parsed.currentSession?.access_token ?? null;
      } catch {
        return raw;
      }
    }
  }

  return null;
}
