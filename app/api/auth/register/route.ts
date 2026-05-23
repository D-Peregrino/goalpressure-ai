import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DEV_USER_COOKIE } from "@/lib/auth/session";
import { emailBoasVindas } from "@/lib/email/provider";
import {
  auditSupabaseEnvForRegister,
  registerUser,
} from "@/lib/auth/registerUser";
import { logError, logInfo } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

const LOG_SCOPE = "api-auth-register";

export async function POST(request: Request) {
  const envAudit = auditSupabaseEnvForRegister();

  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
    };

    const name = body.name?.trim() ?? "";
    const email = body.email?.trim() ?? "";
    const password = body.password ?? "";

    logInfo(LOG_SCOPE, "POST /api/auth/register", {
      email: email ? `${email.slice(0, 3)}***` : "(vazio)",
      env: envAudit,
    });

    const result = await registerUser({ name, email, password });

    if (!result.ok) {
      logError(LOG_SCOPE, "cadastro rejeitado", {
        error: result.error,
        code: result.code,
        status: result.status,
      });
      return NextResponse.json(
        {
          ok: false,
          error: result.error,
          message: result.error,
          code: result.code ?? null,
        },
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

    if (email) {
      await emailBoasVindas(email, name || "Cliente");
    }

    logInfo(LOG_SCOPE, "cadastro ok", {
      userId: result.userId,
      mode: result.mode,
      needsEmailConfirmation: result.needsEmailConfirmation ?? false,
      hasSession: Boolean(result.accessToken),
    });

    return NextResponse.json({
      ok: true,
      userId: result.userId,
      mode: result.mode,
      needsEmailConfirmation: result.needsEmailConfirmation ?? false,
      accessToken: result.accessToken ?? null,
      refreshToken: result.refreshToken ?? null,
      message: result.needsEmailConfirmation
        ? "Conta criada. Confirme seu e-mail para entrar."
        : "Conta criada com sucesso.",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro interno ao cadastrar.";
    logError(LOG_SCOPE, "exceção não tratada", { message, stack: e instanceof Error ? e.stack : undefined });
    return NextResponse.json(
      {
        ok: false,
        error: message,
        message,
      },
      { status: 500 }
    );
  }
}
