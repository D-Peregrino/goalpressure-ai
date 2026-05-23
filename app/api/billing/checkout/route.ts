import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/requireUser";
import { buildCheckout } from "@/lib/billing/provider";
import { activateFundadorSubscription } from "@/lib/commercial/db";
import { updateDevUserPlan, devAuthEnabled } from "@/lib/auth/devStore";
import { aplicarCupom } from "@/lib/subscription/coupons";
import { PLANO_FUNDADOR_CENTAVOS, UNICO_PLANO_COMPRAVEL } from "@/lib/subscription/plans";
import { emailFundadorAtivo, emailPagamento } from "@/lib/email/provider";
import { formatarPreco } from "@/lib/subscription/plans";
import { DEV_USER_COOKIE } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/** GET — conclui checkout mock ou redireciona para provedor futuro */
export async function GET(request: NextRequest) {
  const provider = request.nextUrl.searchParams.get("provider") ?? "mock";
  const cupomParam = request.nextUrl.searchParams.get("cupom");
  const session = request.nextUrl.searchParams.get("session");
  const base = request.nextUrl.origin;

  const user = await requireUser(request);
  if (!user) {
    return NextResponse.redirect(`${base}/entrar?redirect=/precos`);
  }

  const cupom = aplicarCupom(cupomParam, PLANO_FUNDADOR_CENTAVOS);
  const finalCents = cupom?.valorFinalCentavos ?? PLANO_FUNDADOR_CENTAVOS;

  if (provider === "mock" || provider === "stripe" || provider === "mercado_pago") {
    if (devAuthEnabled()) {
      const cookieStore = await cookies();
      const id = cookieStore.get(DEV_USER_COOKIE)?.value;
      if (id) {
        updateDevUserPlan(id, "fundador", {
          couponCode: cupom?.codigo ?? undefined,
          status: "active",
        });
      }
    } else {
      await activateFundadorSubscription({
        userId: user.id,
        couponCode: cupom?.codigo ?? null,
        originalCents: PLANO_FUNDADOR_CENTAVOS,
        discountPercent: cupom?.descontoPercent ?? 0,
        finalCents,
        provider: "mock",
        providerPaymentId: session ?? undefined,
      });
    }

    await emailFundadorAtivo(user.email, user.name);
    await emailPagamento(user.email, user.name, formatarPreco(finalCents));

    return NextResponse.redirect(`${base}/conta?pagamento=ok`);
  }

  return NextResponse.redirect(`${base}/precos?erro=provedor`);
}

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) {
    return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });
  }

  const body = (await request.json()) as { planId?: string; couponCode?: string };
  if (body.planId !== UNICO_PLANO_COMPRAVEL) {
    return NextResponse.json({ error: "Este plano ainda não está disponível." }, { status: 400 });
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const checkout = buildCheckout({
    planId: UNICO_PLANO_COMPRAVEL,
    userId: user.id,
    email: user.email,
    couponCode: body.couponCode,
    successUrl: `${base}/conta?pagamento=ok`,
    cancelUrl: `${base}/precos`,
  });

  return NextResponse.json({
    ok: true,
    url: checkout.checkoutUrl,
    provider: checkout.provider,
    originalCents: checkout.originalCents,
    finalCents: checkout.finalCents,
    discountPercent: checkout.discountPercent,
    couponCode: checkout.couponCode,
    mock: checkout.provider === "mock",
  });
}
