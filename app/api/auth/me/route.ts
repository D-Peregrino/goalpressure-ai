import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { isAdminEmail } from "@/lib/auth/admin";
import { DEV_USER_COOKIE } from "@/lib/auth/session";
import { findDevUserById, devAuthEnabled } from "@/lib/auth/devStore";
import { fetchSubscriptionForUser } from "@/lib/commercial/db";
import type { DbPlan } from "@/lib/subscription/permissions";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (devAuthEnabled()) {
    const cookieStore = await cookies();
    const id = cookieStore.get(DEV_USER_COOKIE)?.value;
    if (!id) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
    const u = findDevUserById(id);
    if (!u) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
    return NextResponse.json({
      user: {
        id: u.id,
        email: u.email,
        name: u.name,
        role: isAdminEmail(u.email) ? "admin" : u.role,
      },
      plan: u.plan,
      subscriptionStatus: u.subscriptionStatus,
      couponCode: u.couponCode,
    });
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");
  const admin = getSupabaseAdmin();
  if (!admin || !token) {
    return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
  }

  const { data: authData, error } = await admin.auth.getUser(token);
  if (error || !authData.user) {
    return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
  }

  const userId = authData.user.id;
  const email = authData.user.email ?? "";

  const { data: profile } = await admin
    .from("profiles")
    .select("name, role")
    .eq("user_id", userId)
    .maybeSingle();

  const sub = await fetchSubscriptionForUser(userId);
  const plan = (sub?.plan as DbPlan) ?? "free";

  return NextResponse.json({
    user: {
      id: userId,
      email,
      name: profile?.name ?? authData.user.user_metadata?.name ?? "",
      role: isAdminEmail(email) ? "admin" : (profile?.role as "user") ?? "user",
    },
    plan,
    subscriptionStatus: sub?.status ?? "active",
    couponCode: sub?.coupon_code ?? null,
  });
}
