"use client";

import { getSupabaseBrowser, resetSupabaseBrowserClient } from "@/lib/supabase/browser";
import { logAdminAuth } from "@/lib/admin/adminAuthLog";

/** Remove cookies HTTP e sessão local quando tokens estão inválidos (evita loop middleware). */
export async function clearStaleAuthSession(reason: string): Promise<void> {
  logAdminAuth("[ADMIN_SESSION]", {
    scope: "clear_stale_session",
    message: reason,
  });

  try {
    await fetch("/api/auth/session", { method: "DELETE", credentials: "include" });
  } catch (e) {
    logAdminAuth("[ADMIN_SESSION]", { scope: "clear_stale_session", message: "delete_failed" }, e);
  }

  const supabase = getSupabaseBrowser();
  if (supabase) {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      /* ignore */
    }
  }
  resetSupabaseBrowserClient();
}
