"use client";

import { getSupabaseBrowser } from "@/lib/supabase/browser";

/** fetch com Bearer da sessão Supabase (admin, billing, conta). */
export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const headers = new Headers(init?.headers);

  const supabase = getSupabaseBrowser();
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(input, {
    ...init,
    headers,
    credentials: "include",
  });
}
