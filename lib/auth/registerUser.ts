import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import {
  getSupabaseAnonKey,
  getSupabasePublicUrl,
  isSupabaseAuthConfigured,
} from "@/lib/supabase/env";
import { logError, logInfo, logWarn } from "@/lib/utils/logger";
import { createDevUser, devAuthEnabled } from "@/lib/auth/devStore";

const LOG_SCOPE = "auth-register";

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

export type RegisterResult =
  | {
      ok: true;
      userId: string;
      accessToken?: string;
      refreshToken?: string;
      needsEmailConfirmation?: boolean;
      mode: "supabase_admin" | "supabase_signup" | "dev";
    }
  | { ok: false; error: string; code?: string; status: number };

export function auditSupabaseEnvForRegister(): {
  url: boolean;
  anonKey: boolean;
  serviceRole: boolean;
  authReady: boolean;
} {
  const url = Boolean(getSupabasePublicUrl());
  const anonKey = Boolean(getSupabaseAnonKey());
  const serviceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
  return {
    url,
    anonKey,
    serviceRole,
    authReady: url && anonKey,
  };
}

async function ensureProfileAndSubscription(
  userId: string,
  name: string,
  email: string
): Promise<{ profileOk: boolean; subscriptionOk: boolean; profileError?: string }> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { profileOk: false, subscriptionOk: false, profileError: "service_role_ausente" };
  }

  const normalizedEmail = email.trim().toLowerCase();

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      user_id: userId,
      name: name.trim(),
      email: normalizedEmail,
      role: "user",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (profileError) {
    logWarn(LOG_SCOPE, "upsert profile falhou", {
      userId,
      message: profileError.message,
      code: profileError.code,
    });
  }

  const { data: existingSub } = await admin
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!existingSub) {
    const { error: subError } = await admin.from("subscriptions").insert({
      user_id: userId,
      plan: "free",
      status: "active",
    });
    if (subError) {
      logWarn(LOG_SCOPE, "insert subscription falhou", {
        userId,
        message: subError.message,
        code: subError.code,
      });
      return {
        profileOk: !profileError,
        subscriptionOk: false,
        profileError: profileError?.message,
      };
    }
  }

  return {
    profileOk: !profileError,
    subscriptionOk: true,
    profileError: profileError?.message,
  };
}

async function registerWithServiceRole(
  input: RegisterInput
): Promise<RegisterResult> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      ok: false,
      error: "SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.",
      status: 503,
    };
  }

  const email = input.email.trim().toLowerCase();

  logInfo(LOG_SCOPE, "criando usuário via admin.createUser", { email });

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { name: input.name.trim() },
  });

  if (error) {
    logError(LOG_SCOPE, "admin.createUser falhou", {
      message: error.message,
      code: error.status,
    });
    const msg =
      error.message.includes("already") || error.message.includes("registered")
        ? "Este e-mail já está cadastrado."
        : error.message;
    return { ok: false, error: msg, code: String(error.status), status: 400 };
  }

  const userId = data.user?.id;
  if (!userId) {
    return {
      ok: false,
      error: "Usuário criado sem ID retornado pelo Supabase.",
      status: 500,
    };
  }

  const ensured = await ensureProfileAndSubscription(userId, input.name, email);
  logInfo(LOG_SCOPE, "perfil pós-cadastro", {
    userId,
    profileOk: ensured.profileOk,
    subscriptionOk: ensured.subscriptionOk,
  });

  const anonClient = createClient(getSupabasePublicUrl(), getSupabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: signInData, error: signInError } =
    await anonClient.auth.signInWithPassword({
      email,
      password: input.password,
    });

  if (signInError) {
    logWarn(LOG_SCOPE, "usuário criado mas login automático falhou", {
      message: signInError.message,
    });
    return {
      ok: true,
      userId,
      needsEmailConfirmation: true,
      mode: "supabase_admin",
    };
  }

  return {
    ok: true,
    userId,
    accessToken: signInData.session?.access_token,
    refreshToken: signInData.session?.refresh_token,
    mode: "supabase_admin",
  };
}

async function registerWithAnonSignUp(
  input: RegisterInput
): Promise<RegisterResult> {
  const url = getSupabasePublicUrl();
  const anonKey = getSupabaseAnonKey();

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const email = input.email.trim().toLowerCase();

  logInfo(LOG_SCOPE, "criando usuário via auth.signUp (anon)", { email });

  const { data, error } = await client.auth.signUp({
    email,
    password: input.password,
    options: {
      data: { name: input.name.trim() },
    },
  });

  if (error) {
    logError(LOG_SCOPE, "auth.signUp falhou", { message: error.message, code: error.code });
    return {
      ok: false,
      error: error.message,
      code: error.code,
      status: 400,
    };
  }

  const userId = data.user?.id;
  if (!userId) {
    return {
      ok: false,
      error: "Cadastro incompleto: usuário não retornado pelo Supabase.",
      status: 500,
    };
  }

  if (getSupabaseAdmin()) {
    await ensureProfileAndSubscription(userId, input.name, email);
  }

  if (data.session) {
    return {
      ok: true,
      userId,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      mode: "supabase_signup",
    };
  }

  logInfo(LOG_SCOPE, "cadastro aguarda confirmação de e-mail", { userId });
  return {
    ok: true,
    userId,
    needsEmailConfirmation: true,
    mode: "supabase_signup",
  };
}

export async function registerUser(input: RegisterInput): Promise<RegisterResult> {
  const env = auditSupabaseEnvForRegister();
  logInfo(LOG_SCOPE, "auditoria de env", env);

  if (!input.email?.includes("@") || input.password.length < 6) {
    return {
      ok: false,
      error: "Informe e-mail válido e senha com pelo menos 6 caracteres.",
      status: 400,
    };
  }

  if (devAuthEnabled()) {
    logInfo(LOG_SCOPE, "modo dev — memória local");
    try {
      const user = createDevUser({
        email: input.email,
        password: input.password,
        name: input.name,
      });
      return { ok: true, userId: user.id, mode: "dev" };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Erro ao cadastrar.",
        status: 400,
      };
    }
  }

  if (!isSupabaseAuthConfigured()) {
    return {
      ok: false,
      error:
        "Supabase Auth não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY (ou PUBLISHABLE_KEY).",
      status: 503,
    };
  }

  if (env.serviceRole) {
    return registerWithServiceRole(input);
  }

  logWarn(LOG_SCOPE, "SERVICE_ROLE ausente — usando signUp com chave anon");
  return registerWithAnonSignUp(input);
}
