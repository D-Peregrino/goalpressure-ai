"use client";

/** Sincroniza sessão do Supabase (localStorage) para cookies HTTP do servidor. */
export async function syncSessionCookies(
  accessToken: string,
  refreshToken: string
): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ accessToken, refreshToken }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
