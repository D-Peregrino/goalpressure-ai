import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabasePublicUrl, isSupabaseAuthConfigured } from "@/lib/supabase/env";
import { getSupabaseAdmin, getSupabaseProjectUrl } from "@/lib/supabase/client";

/** Valida JWT de sessão no servidor (service role ou anon + token). */
export async function getUserFromAccessToken(
  accessToken: string
): Promise<{ user: User | null; error?: string }> {
  const admin = getSupabaseAdmin();
  if (admin) {
    const { data, error } = await admin.auth.getUser(accessToken);
    if (error) return { user: null, error: error.message };
    return { user: data.user };
  }

  if (!isSupabaseAuthConfigured()) {
    return { user: null, error: "auth_nao_configurado" };
  }

  const url = getSupabaseProjectUrl() || getSupabasePublicUrl();
  const anonKey = getSupabaseAnonKey();
  if (!url || !anonKey) {
    return { user: null, error: "auth_nao_configurado" };
  }

  const client: SupabaseClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(accessToken);
  if (error) return { user: null, error: error.message };
  return { user: data.user };
}

export function isServerAuthReady(): boolean {
  return isSupabaseAuthConfigured();
}
