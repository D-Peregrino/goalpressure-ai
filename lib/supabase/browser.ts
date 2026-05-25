"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabasePublicUrl } from "@/lib/supabase/env";

export type BrowserSupabaseConfig = {
  url: string;
  anonKey: string;
};

let browserClient: SupabaseClient | null = null;
let lastConfigKey = "";

function readRuntimeConfig(): BrowserSupabaseConfig | null {
  if (typeof window !== "undefined") {
    const injected = window.__GP_SUPABASE__;
    if (injected?.url?.trim() && injected?.anonKey?.trim()) {
      return { url: injected.url.trim(), anonKey: injected.anonKey.trim() };
    }
    const el = document.getElementById("gp-supabase-config");
    if (el?.textContent) {
      try {
        const parsed = JSON.parse(el.textContent) as BrowserSupabaseConfig;
        if (parsed.url?.trim() && parsed.anonKey?.trim()) {
          return { url: parsed.url.trim(), anonKey: parsed.anonKey.trim() };
        }
      } catch {
        /* ignore */
      }
    }
  }

  const url = getSupabasePublicUrl();
  const anonKey = getSupabaseAnonKey();
  if (url && anonKey) return { url, anonKey };
  return null;
}

export function getBrowserSupabaseConfig(): BrowserSupabaseConfig | null {
  return readRuntimeConfig();
}

export function isSupabaseAuthConfigured(): boolean {
  return getBrowserSupabaseConfig() !== null;
}

export function getSupabaseBrowser(): SupabaseClient | null {
  if (typeof window === "undefined") return null;

  const cfg = readRuntimeConfig();
  if (!cfg) return null;

  const configKey = `${cfg.url}|${cfg.anonKey.slice(0, 8)}`;
  if (!browserClient || lastConfigKey !== configKey) {
    browserClient = createClient(cfg.url, cfg.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
        storage: typeof window !== "undefined" ? window.localStorage : undefined,
      },
    });
    lastConfigKey = configKey;
  }
  return browserClient;
}

export function resetSupabaseBrowserClient(): void {
  browserClient = null;
  lastConfigKey = "";
}
