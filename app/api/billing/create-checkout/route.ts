import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { planoPorId, type PlanId } from "@/lib/subscription/plans";
import { aplicarCupom } from "@/lib/subscription/coupons";
import { buildCheckout } from "@/lib/billing/provider";
import { createMercadoPagoRecurringPreapproval } from "@/lib/billing/mercadoPago";

export const dynamic = "force-dynamic";

/**
 * Cria checkout para assinatura recorrente.
 * - provider mock: devolve URL que ativa via /api/billing/checkout (compat)
 * - provider mercado_pago: cria preapproval e retorna init_point
 */
export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) {
    return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });
  }

  const body = (await request.json()) as { planId?: PlanId; couponCode?: string };
  const planId = body.planId;
  if (!planId) {
    return NextResponse.json({ error: "planId obrigatório." }, { status: 400 });
  }

  const plan = planoPorId(planId);
  if (!plan || !plan.disponivel) {
    return NextResponse.json({ error: "Plano indisponível." }, { status: 400 });
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const successUrl = process.env.MERCADOPAGO_SUCCESS_URL?.trim() || `${base}/minha-assinatura?status=ok`;
  const failureUrl = process.env.MERCADOPAGO_FAILURE_URL?.trim() || `${base}/minha-assinatura?status=fail`;
  const pendingUrl = process.env.MERCADOPAGO_PENDING_URL?.trim() || `${base}/minha-assinatura?status=pending`;

  const checkout = buildCheckout({
    planId,
    userId: user.id,
    email: user.email,
    couponCode: body.couponCode,
    successUrl,
    cancelUrl: `${base}/planos`,
  });

  if (checkout.provider !== "mercado_pago") {
    return NextResponse.json({
      ok: true,
      url: checkout.checkoutUrl,
      provider: checkout.provider,
      sessionId: checkout.sessionId,
      originalCents: checkout.originalCents,
      finalCents: checkout.finalCents,
      discountPercent: checkout.discountPercent,
      couponCode: checkout.couponCode,
      mock: checkout.provider === "mock",
    });
  }

  const coupon = aplicarCupom(body.couponCode, checkout.originalCents);
  const mp = await createMercadoPagoRecurringPreapproval({
    amountCents: coupon?.valorFinalCentavos ?? checkout.finalCents,
    currency: "BRL",
    email: user.email,
    successUrl,
    failureUrl,
    pendingUrl,
    reason: `GoalPressure AI — ${plan.nome}`,
    externalReference: `gp:${user.id}:${plan.dbPlan}:${checkout.sessionId}`,
    metadata: {
      gp_user_id: user.id,
      gp_plan: plan.dbPlan,
      gp_plan_id: plan.id,
      gp_session: checkout.sessionId,
      coupon: coupon?.codigo ?? null,
    },
  });

  if (!mp) {
    return NextResponse.json(
      { error: "Mercado Pago não configurado ou falha ao criar assinatura." },
      { status: 500 }
    );
  }

  // Marca assinatura como "incomplete" aguardando webhook (não bloqueia flows antigos).
  if (isSupabaseConfigured()) {
    const db = getSupabaseAdmin();
    if (db) {
      await db.from("subscriptions").upsert(
        {
          user_id: user.id,
          plan: plan.dbPlan,
          status: "incomplete",
          provider: "mercado_pago",
          provider_subscription_id: mp.id,
          provider_customer_id: user.email,
          current_period_start: new Date().toISOString(),
          current_period_end: null,
        },
        { onConflict: "user_id" }
      );
    }
  }

  return NextResponse.json({
    ok: true,
    url: mp.url,
    provider: "mercado_pago",
    preapprovalId: mp.id,
    originalCents: checkout.originalCents,
    finalCents: checkout.finalCents,
    discountPercent: checkout.discountPercent,
    couponCode: checkout.couponCode,
  });
}

