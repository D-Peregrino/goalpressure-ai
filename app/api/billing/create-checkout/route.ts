import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { resolveBillingProvider } from "@/lib/billing/provider";
import {
  createStripeCheckoutSession,
  stripeConfigured,
} from "@/lib/billing/stripe";
import { createMercadoPagoRecurringPreapproval } from "@/lib/billing/mercadoPago";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { aplicarCupom } from "@/lib/subscription/coupons";
import { planoPorId, type PlanId } from "@/lib/subscription/plans";
import {
  isPaidPlanSlug,
  OFFICIAL_PLANS,
  type PlanSlug,
} from "@/lib/billing/planSlugs";
import { devAuthEnabled, updateDevUserPlan } from "@/lib/auth/devStore";
import { cookies } from "next/headers";
import { DEV_USER_COOKIE } from "@/lib/auth/session";
import { upsertUserSubscription } from "@/lib/billing/userSubscriptionStore";

export const dynamic = "force-dynamic";

function mapPlanIdToSlug(planId?: string, planSlug?: string): PlanSlug | null {
  if (planSlug && isPaidPlanSlug(planSlug)) return planSlug;
  const map: Record<string, PlanSlug> = {
    gratuito: "free",
    fundador: "founder",
    profissional: "pro",
    elite: "pro",
    starter: "starter",
    pro: "pro",
    founder: "founder",
  };
  if (planId && map[planId]) return map[planId];
  return null;
}

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) {
    return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });
  }

  const body = (await request.json()) as {
    planId?: PlanId | string;
    planSlug?: PlanSlug;
    couponCode?: string;
    interval?: "month" | "year";
  };

  const planSlug = mapPlanIdToSlug(body.planId, body.planSlug);
  if (!planSlug || planSlug === "free") {
    return NextResponse.json({ error: "Plano inválido." }, { status: 400 });
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const successUrl = `${base}/billing?status=success`;
  const cancelUrl = `${base}/billing?status=cancel`;

  const provider = resolveBillingProvider();

  if (provider === "stripe" && stripeConfigured()) {
    try {
      const session = await createStripeCheckoutSession({
        userId: user.id,
        email: user.email,
        planSlug,
        interval: body.interval ?? "month",
        couponCode: body.couponCode,
        successUrl,
        cancelUrl,
      });

      await upsertUserSubscription({
        userId: user.id,
        planSlug,
        status: "incomplete",
        couponCode: body.couponCode?.trim().toUpperCase() ?? null,
      });

      return NextResponse.json({
        ok: true,
        url: session.url,
        provider: "stripe",
        sessionId: session.id,
        planSlug,
        couponCode: body.couponCode ?? null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro Stripe.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  if (provider === "mock" || devAuthEnabled()) {
    const cookieStore = await cookies();
    const devId = cookieStore.get(DEV_USER_COOKIE)?.value;
    const legacyPlan =
      planSlug === "founder" ? "fundador" : planSlug === "starter" ? "starter" : "pro";

    if (devId) {
      updateDevUserPlan(devId, legacyPlan, {
        couponCode: body.couponCode,
        status: "trialing",
      });
    }

    await upsertUserSubscription({
      userId: user.id,
      planSlug,
      status: "trialing",
      couponCode: body.couponCode?.trim().toUpperCase() ?? null,
      trialEndsAt: new Date(Date.now() + 7 * 24 * 3600_000),
    });

    return NextResponse.json({
      ok: true,
      url: successUrl,
      provider: "mock",
      mock: true,
      planSlug,
    });
  }

  if (provider === "mercado_pago" && planSlug === "founder") {
    const plan = planoPorId("fundador");
    if (!plan) {
      return NextResponse.json({ error: "Plano indisponível." }, { status: 400 });
    }
    const cupom = aplicarCupom(body.couponCode, plan.precoMensalCentavos);
    const mp = await createMercadoPagoRecurringPreapproval({
      amountCents: cupom?.valorFinalCentavos ?? plan.precoMensalCentavos,
      currency: "BRL",
      email: user.email,
      successUrl: `${base}/minha-assinatura?status=ok`,
      failureUrl: `${base}/minha-assinatura?status=fail`,
      pendingUrl: `${base}/minha-assinatura?status=pending`,
      reason: `GoalPressure AI — ${plan.nome}`,
      externalReference: `gp:${user.id}:fundador`,
      metadata: { gp_user_id: user.id, gp_plan: "fundador" },
    });
    if (!mp) {
      return NextResponse.json({ error: "Mercado Pago indisponível." }, { status: 500 });
    }
    if (isSupabaseConfigured()) {
      const db = getSupabaseAdmin();
      if (db) {
        await db.from("subscriptions").upsert(
          {
            user_id: user.id,
            plan: "fundador",
            status: "incomplete",
            provider: "mercado_pago",
            provider_subscription_id: mp.id,
          },
          { onConflict: "user_id" }
        );
      }
    }
    return NextResponse.json({ ok: true, url: mp.url, provider: "mercado_pago" });
  }

  return NextResponse.json(
    {
      error: "Pagamentos não configurados. Defina STRIPE_SECRET_KEY.",
      plan: OFFICIAL_PLANS[planSlug].name,
    },
    { status: 503 }
  );
}
