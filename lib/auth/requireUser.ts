import { cookies } from "next/headers";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { isAdminEmail } from "@/lib/auth/admin";
import { DEV_USER_COOKIE, type SessionUser } from "@/lib/auth/session";
import { findDevUserById, devAuthEnabled } from "@/lib/auth/devStore";

export async function requireUser(): Promise<SessionUser | null> {
  if (devAuthEnabled()) {
    const cookieStore = await cookies();
    const id = cookieStore.get(DEV_USER_COOKIE)?.value;
    if (!id) return null;
    const u = findDevUserById(id);
    if (!u) return null;
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      role: isAdminEmail(u.email) ? "admin" : u.role,
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin || !isSupabaseConfigured()) return null;

  const cookieStore = await cookies();
  const token =
    cookieStore.get("sb-access-token")?.value ??
    cookieStore.get(`sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split("//")[1]?.split(".")[0]}-auth-token`)?.value;

  if (!token) return null;

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user?.email) return null;

  const email = data.user.email;
  const { data: profile } = await admin
    .from("profiles")
    .select("name, role")
    .eq("user_id", data.user.id)
    .maybeSingle();

  return {
    id: data.user.id,
    email,
    name: profile?.name ?? data.user.user_metadata?.name ?? "",
    role: isAdminEmail(email) ? "admin" : (profile?.role as "user" | "admin") ?? "user",
  };
}

export async function requireAdmin(): Promise<SessionUser | null> {
  const user = await requireUser();
  if (!user || user.role !== "admin") return null;
  return user;
}
