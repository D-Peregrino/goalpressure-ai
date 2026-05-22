import { NextResponse } from "next/server";
import { validateStripeWebhook } from "@/lib/billing/stripe";

export const dynamic = "force-dynamic";

/**
 * Webhook placeholder — validar assinatura quando STRIPE_WEBHOOK_SECRET estiver definido.
 */
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature") ?? "";
  const payload = await request.text();

  if (process.env.STRIPE_WEBHOOK_SECRET?.trim()) {
    if (!validateStripeWebhook(payload, signature)) {
      return NextResponse.json({ error: "assinatura_invalida" }, { status: 400 });
    }
    // TODO: processar eventos Stripe e atualizar subscriptions/payments
  }

  if (process.env.MERCADO_PAGO_WEBHOOK_SECRET?.trim()) {
    // TODO: validar notificação Mercado Pago
  }

  return NextResponse.json({ received: true, mode: "placeholder" });
}
