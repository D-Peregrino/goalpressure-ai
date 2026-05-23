import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DEV_USER_COOKIE } from "@/lib/auth/session";
import { loginUser } from "@/lib/auth/loginUser";
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

    if (result.mode === "dev") {
      const cookieStore = await cookies();
      cookieStore.set(DEV_USER_COOKIE, result.userId, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    logInfo(LOG_SCOPE, "login ok", { userId: result.userId, mode: result.mode });

    return NextResponse.json({
      ok: true,
      userId: result.userId,
      mode: result.mode,
      accessToken: result.accessToken ?? null,
      refreshToken: result.refreshToken ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao entrar.";
    logError(LOG_SCOPE, "exceção", { message });
    return NextResponse.json(
      { ok: false, error: message, message },
      { status: 500 }
    );
  }
}
