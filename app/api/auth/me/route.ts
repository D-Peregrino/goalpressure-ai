import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isAdminEmail } from "@/lib/auth/admin";
import { resolveAccountPayload } from "@/lib/auth/resolveAccount";
import { DEV_USER_COOKIE } from "@/lib/auth/session";
import { findDevUserById, devAuthEnabled } from "@/lib/auth/devStore";
import { getEffectivePlan } from "@/lib/auth/entitlements";
import type { DbPlan } from "@/lib/subscription/permissions";
import { getAccessTokenFromRequest } from "@/lib/supabase/session-cookies";
import { getUserFromAccessToken } from "@/lib/supabase/server-auth";
import { getSupabaseAdmin } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (devAuthEnabled()) {
    const cookieStore = await cookies();
    const id = cookieStore.get(DEV_USER_COOKIE)?.value;
    if (!id) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
    const u = findDevUserById(id);
    if (!u) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
    const role = isAdminEmail(u.email) ? "admin" : u.role;
    const rawPlan = role === "admin" ? "fundador" : u.plan;
    const plan = getEffectivePlan(rawPlan, role, u.subscriptionStatus);
    const planSlug =
      role === "admin"
        ? "founder"
        : u.plan === "fundador"
          ? "founder"
          : u.plan === "starter"
            ? "starter"
            : u.plan === "pro"
              ? "pro"
              : "free";
    return NextResponse.json({
      user: {
        id: u.id,
        email: u.email,
        name: u.name,
        role,
      },
      plan,
      planSlug,
      subscriptionStatus: role === "admin" ? "active" : u.subscriptionStatus,
      couponCode: u.couponCode,
      cancelAtPeriodEnd: false,
    });
  }

  const token = await getAccessTokenFromRequest(request);
  if (!token) {
    return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
  }

  const { user: authUser, error } = await getUserFromAccessToken(token);
  if (error || !authUser?.email) {
    return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  let profileName = authUser.user_metadata?.name as string | undefined;
  let profileRole: string | undefined;

  if (admin) {
    const { data: profile } = await admin
      .from("profiles")
      .select("name, role")
      .eq("user_id", authUser.id)
      .maybeSingle();
    profileName = profile?.name ?? profileName;
    profileRole = profile?.role;
  }

  const account = await resolveAccountPayload({
    userId: authUser.id,
    email: authUser.email,
    name: profileName ?? "",
    profileRole,
  });

  return NextResponse.json(account);
}
