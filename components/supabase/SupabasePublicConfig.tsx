import { getPublicSupabaseConfig } from "@/lib/supabase/env";

/**
 * Injeta credenciais públicas em runtime (Railway) para o bundle do cliente,
 * mesmo quando NEXT_PUBLIC_* não estavam no momento do build.
 */
export default function SupabasePublicConfig() {
  const cfg = getPublicSupabaseConfig();
  if (!cfg.configured) return null;

  const payload = JSON.stringify({ url: cfg.url, anonKey: cfg.anonKey });

  return (
    <>
      <script
        id="gp-supabase-config"
        type="application/json"
        dangerouslySetInnerHTML={{ __html: payload }}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `window.__GP_SUPABASE__=${payload};`,
        }}
      />
    </>
  );
}
