import { aplicarCupom } from "@/lib/subscription/coupons";
import {
  PLANO_FUNDADOR_CENTAVOS,
  planoPodeComprar,
  type PlanId,
} from "@/lib/subscription/plans";

export type BillingProvider = "mock" | "stripe" | "mercado_pago";

export interface CheckoutInput {
  planId: PlanId;
  userId: string;
  email: string;
  couponCode?: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutResult {
  provider: BillingProvider;
  checkoutUrl: string;
  sessionId: string;
  originalCents: number;
  finalCents: number;
  discountPercent: number;
  couponCode: string | null;
}

export function resolveBillingProvider(): BillingProvider {
  if (process.env.STRIPE_SECRET_KEY?.trim()) return "stripe";
  if (process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim()) return "mercado_pago";
  return "mock";
}

export function buildCheckout(input: CheckoutInput): CheckoutResult {
  if (!planoPodeComprar(input.planId)) {
    throw new Error("Este plano ainda não está disponível para compra.");
  }

  const cupom = aplicarCupom(input.couponCode, PLANO_FUNDADOR_CENTAVOS);
  const originalCents = PLANO_FUNDADOR_CENTAVOS;
  const finalCents = cupom?.valorFinalCentavos ?? originalCents;
  const discountPercent = cupom?.descontoPercent ?? 0;
  const couponCode = cupom?.codigo ?? null;

  const provider = resolveBillingProvider();
  const sessionId = `chk_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const params = new URLSearchParams({
    session: sessionId,
    plan: input.planId,
  });
  if (couponCode) params.set("cupom", couponCode);

  let checkoutUrl: string;
  if (provider === "stripe") {
    checkoutUrl = `${base}/api/billing/checkout?provider=stripe&${params}`;
  } else if (provider === "mercado_pago") {
    checkoutUrl = `${base}/api/billing/checkout?provider=mercado_pago&${params}`;
  } else {
    checkoutUrl = `${base}/api/billing/checkout?provider=mock&${params}`;
  }

  return {
    provider,
    checkoutUrl,
    sessionId,
    originalCents,
    finalCents,
    discountPercent,
    couponCode,
  };
}
