import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { isAdminEmail } from "@/lib/auth/admin";
import { resolveAccountPayload } from "@/lib/auth/resolveAccount";
import {
  getEffectivePlan,
  getPostLoginRedirect,
  hasTerminalAccess,
  sessionDebugReason,
} from "@/lib/auth/entitlements";
import { fetchSubscriptionForUser } from "@/lib/commercial/db";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { devAuthEnabled, findDevUserById } from "@/lib/auth/devStore";
import { cookies } from "next/headers";
import { DEV_USER_COOKIE } from "@/lib/auth/session";
import { getAccessTokenFromRequest } from "@/lib/supabase/session-cookies";
import { SB_ACCESS_COOKIE } from "@/lib/supabase/session-cookie-names";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const hasAccessCookie = Boolean(cookieStore.get(SB_ACCESS_COOKIE)?.value);
  const hasBearer = Boolean(
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim()
  );
  const tokenPreview = await getAccessTokenFromRequest(request);

  const user = await requireUser(request);

  if (!user) {
    return NextResponse.json({
      loggedIn: false,
      userEmail: null,
      userId: null,
      isAdmin: false,
      effectivePlan: "free",
      subscriptionStatus: "inactive",
      hasTerminalAccess: false,
      redirectTarget: "/entrar",
      reason: "nao_autenticado",
      debug: {
        hasAccessCookie,
        hasBearer,
        hasToken: Boolean(tokenPreview),
      },
    });
  }

  if (devAuthEnabled()) {
    const dev = findDevUserById(cookieStore.get(DEV_USER_COOKIE)?.value ?? "");
    const role = user.role;
    const plan = role === "admin" ? "fundador" : (dev?.plan ?? "free");
    const subscriptionStatus = dev?.subscriptionStatus ?? "active";
    const effectivePlan = getEffectivePlan(plan, role, subscriptionStatus);
    const payload = {
      loggedIn: true,
      userEmail: user.email,
      userId: user.id,
      isAdmin: role === "admin",
      effectivePlan,
      subscriptionStatus,
      hasTerminalAccess: hasTerminalAccess(effectivePlan, role, subscriptionStatus),
      redirectTarget: getPostLoginRedirect({ role, plan: effectivePlan, subscriptionStatus }),
      reason: sessionDebugReason({
        loggedIn: true,
        role,
        plan: effectivePlan,
        subscriptionStatus,
      }),
    };
    return NextResponse.json(payload);
  }

  const admin = getSupabaseAdmin();
  let profileRole: string | undefined;
  if (admin) {
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    profileRole = profile?.role;
  }

  const account = await resolveAccountPayload({
    userId: user.id,
    email: user.email,
    name: user.name,
    profileRole,
  });

  const rawSub = await fetchSubscriptionForUser(user.id);

    return NextResponse.json({
    loggedIn: true,
    userEmail: user.email,
    userId: user.id,
    isAdmin: account.user.role === "admin" || isAdminEmail(user.email),
    effectivePlan: account.plan,
    rawPlan: (rawSub?.plan as string) ?? "free",
    subscriptionStatus: account.subscriptionStatus,
    hasTerminalAccess: hasTerminalAccess(
      account.plan,
      account.user.role,
      account.subscriptionStatus
    ),
    redirectTarget: getPostLoginRedirect({
      role: account.user.role,
      plan: account.plan,
      subscriptionStatus: account.subscriptionStatus,
    }),
    reason: sessionDebugReason({
      loggedIn: true,
      role: account.user.role,
      plan: account.plan,
      subscriptionStatus: account.subscriptionStatus,
    }),
    debug: { hasAccessCookie, hasBearer, hasToken: Boolean(tokenPreview) },
  });
}
