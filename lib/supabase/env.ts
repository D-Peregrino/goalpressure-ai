/**
 * Variáveis públicas Supabase — única fonte de verdade.
 * Aceita NEXT_PUBLIC_SUPABASE_ANON_KEY ou NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (Railway).
 */

export type PublicSupabaseConfig = {
  url: string;
  anonKey: string;
  configured: boolean;
};

export function getSupabasePublicUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
}

/** Chave anon / publishable — mesmo papel no Supabase Auth. */
export function getSupabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    ""
  );
}

/** Config lida no servidor (Railway injeta em runtime). */
export function getPublicSupabaseConfig(): PublicSupabaseConfig {
  const url = getSupabasePublicUrl();
  const anonKey = getSupabaseAnonKey();
  return {
    url,
    anonKey,
    configured: Boolean(url && anonKey),
  };
}

export function isSupabaseAuthConfigured(): boolean {
  return getPublicSupabaseConfig().configured;
}

/** Ref do projeto para nomes de cookie Supabase (ex.: sb-xxx-auth-token). */
export function getSupabaseProjectRef(): string | null {
  const url = getSupabasePublicUrl();
  if (!url) return null;
  try {
    const host = new URL(url).hostname;
    return host.split(".")[0] ?? null;
  } catch {
    return null;
  }
}
