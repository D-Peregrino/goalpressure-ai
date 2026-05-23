import { cookies } from "next/headers";
import { isAdminEmail } from "@/lib/auth/admin";
import { DEV_USER_COOKIE, type SessionUser } from "@/lib/auth/session";
import { findDevUserById, devAuthEnabled } from "@/lib/auth/devStore";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { getSupabaseProjectRef } from "@/lib/supabase/env";
import { getUserFromAccessToken } from "@/lib/supabase/server-auth";

async function tokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const direct = cookieStore.get("sb-access-token")?.value;
  if (direct) return direct;

  const ref = getSupabaseProjectRef();
  if (!ref) return null;

  const raw = cookieStore.get(`sb-${ref}-auth-token`)?.value;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as {
      access_token?: string;
      currentSession?: { access_token?: string };
    };
    return parsed.access_token ?? parsed.currentSession?.access_token ?? null;
  } catch {
    return raw;
  }
}

export async function requireUser(request?: Request): Promise<SessionUser | null> {
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

  const bearer = request?.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const token = bearer || (await tokenFromCookies());
  if (!token) return null;

  const { user, error } = await getUserFromAccessToken(token);
  if (error || !user?.email) return null;

  const email = user.email;
  const admin = getSupabaseAdmin();
  let name = (user.user_metadata?.name as string) ?? "";
  let role: "user" | "admin" = "user";

  if (admin) {
    const { data: profile } = await admin
      .from("profiles")
      .select("name, role")
      .eq("user_id", user.id)
      .maybeSingle();
    name = profile?.name ?? name;
    role = isAdminEmail(email) ? "admin" : (profile?.role as "user" | "admin") ?? "user";
  } else {
    role = isAdminEmail(email) ? "admin" : "user";
  }

  return {
    id: user.id,
    email,
    name,
    role,
  };
}

export async function requireAdmin(request?: Request): Promise<SessionUser | null> {
  const user = await requireUser(request);
  if (!user || user.role !== "admin") return null;
  return user;
}
