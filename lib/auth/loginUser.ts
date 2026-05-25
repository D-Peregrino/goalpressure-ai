import { createClient } from "@supabase/supabase-js";
import {
  getSupabaseAnonKey,
  getSupabasePublicUrl,
  isSupabaseAuthConfigured,
} from "@/lib/supabase/env";
import { logError, logInfo } from "@/lib/utils/logger";
import { verifyDevUser, devAuthEnabled } from "@/lib/auth/devStore";

const LOG_SCOPE = "auth-login";

export type LoginResult =
  | {
      ok: true;
      userId: string;
      accessToken?: string;
      refreshToken?: string;
      expiresIn?: number;
      mode: "supabase" | "dev";
    }
  | { ok: false; error: string; status: number };

export async function loginUser(
  email: string,
  password: string
): Promise<LoginResult> {
  const normalized = email.trim().toLowerCase();

  if (!normalized.includes("@") || !password) {
    return {
      ok: false,
      error: "Informe e-mail e senha válidos.",
      status: 400,
    };
  }

  if (devAuthEnabled()) {
    const user = verifyDevUser(normalized, password);
    if (!user) {
      return { ok: false, error: "E-mail ou senha inválidos.", status: 401 };
    }
    return { ok: true, userId: user.id, mode: "dev" };
  }

  if (!isSupabaseAuthConfigured()) {
    return {
      ok: false,
      error: "Autenticação não configurada no servidor.",
      status: 503,
    };
  }

  const client = createClient(getSupabasePublicUrl(), getSupabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  logInfo(LOG_SCOPE, "signInWithPassword", { email: `${normalized.slice(0, 3)}***` });

  const { data, error } = await client.auth.signInWithPassword({
    email: normalized,
    password,
  });

  if (error) {
    logError(LOG_SCOPE, "login falhou", { message: error.message });
    return {
      ok: false,
      error: error.message,
      status: 401,
    };
  }

  if (!data.user?.id || !data.session) {
    return {
      ok: false,
      error: "Sessão não iniciada. Confirme seu e-mail ou tente novamente.",
      status: 401,
    };
  }

  return {
    ok: true,
    userId: data.user.id,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresIn: data.session.expires_in ?? 3600,
    mode: "supabase",
  };
}
