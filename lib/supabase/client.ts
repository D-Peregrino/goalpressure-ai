/**
 * Server-side Supabase admin client (service role).
 * Never import in client components — use API routes only.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { logWarn } from "@/lib/utils/logger";
import { getSupabasePublicUrl } from "@/lib/supabase/env";

const LOG_SCOPE = "supabase-client";

let adminClient: SupabaseClient | null = null;

/** URL do projeto — servidor (service role). */
export function getSupabaseProjectUrl(): string {
  return process.env.SUPABASE_URL?.trim() || getSupabasePublicUrl();
}

export function isSupabaseConfigured(): boolean {
  const url = getSupabaseProjectUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return Boolean(url && key);
}

/**
 * Returns a singleton Supabase client using the service role key, or null
 * when credentials are not configured (local JSON-only mode).
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (typeof window !== "undefined") {
    logWarn(LOG_SCOPE, "getSupabaseAdmin called on client — blocked");
    return null;
  }

  if (!isSupabaseConfigured()) return null;

  if (!adminClient) {
    const url = getSupabaseProjectUrl();
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!.trim();

    adminClient = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return adminClient;
}

/** Resets singleton (tests / config hot-reload). */
export function resetSupabaseClient(): void {
  adminClient = null;
}
