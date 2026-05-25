import { NextResponse } from "next/server";
import { DEV_USER_COOKIE } from "@/lib/auth/session";
import { loginUser } from "@/lib/auth/loginUser";
import { applySupabaseSessionCookies } from "@/lib/supabase/session-cookies";
import { logError, logInfo } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

const LOG_SCOPE = "api-auth-login";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email ?? "";
    const password = body.password ?? "";

    const result = await loginUser(email, password);

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error, message: result.error },
        { status: result.status }
      );
    }

    const response = NextResponse.json({
      ok: true,
      userId: result.userId,
      mode: result.mode,
      accessToken: result.accessToken ?? null,
      refreshToken: result.refreshToken ?? null,
    });

    if (result.mode === "dev") {
      response.cookies.set(DEV_USER_COOKIE, result.userId, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
        secure: process.env.NODE_ENV === "production",
      });
    } else if (result.accessToken && result.refreshToken) {
      applySupabaseSessionCookies(response, {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
      });
    }

    logInfo(LOG_SCOPE, "login ok", { userId: result.userId, mode: result.mode });
    return response;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao entrar.";
    logError(LOG_SCOPE, "exceção", { message });
    return NextResponse.json(
      { ok: false, error: message, message },
      { status: 500 }
    );
  }
}
