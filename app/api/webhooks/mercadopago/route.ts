import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  fetchMercadoPagoPayment,
  fetchMercadoPagoPreapproval,
  validateMercadoPagoWebhook,
} from "@/lib/billing/mercadoPago";

export const dynamic = "force-dynamic";

type MercadoPagoWebhookPayload =
  | { type?: string; action?: string; data?: { id?: string | number } }
  | Record<string, unknown>;

function toStr(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
}

/**
 * Mercado Pago webhook receiver.
 * - Validates signature when MERCADO_PAGO_WEBHOOK_SECRET is configured.
 * - Fetches payment/preapproval details and updates subscriptions/payments.
 */
export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const dataId =
    url.searchParams.get("data.id") ??
    url.searchParams.get("id") ??
    url.searchParams.get("data_id") ??
    null;

  const xSignature = request.headers.get("x-signature");
  const xRequestId = request.headers.get("x-request-id");
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET?.trim() || null;

  if (secret) {
    const ok = validateMercadoPagoWebhook({
      xSignature,
      xRequestId,
      dataId,
      secret,
    });
    if (!ok) {
      return NextResponse.json({ error: "assinatura_invalida" }, { status: 400 });
    }
  }

  const payload = (await request.json().catch(() => ({}))) as MercadoPagoWebhookPayload;
  const type = toStr((payload as { type?: unknown }).type) ?? "unknown";
  const action = toStr((payload as { action?: unknown }).action) ?? null;
  const id = toStr((payload as { data?: { id?: unknown } }).data?.id) ?? dataId;

  const db = getSupabaseAdmin();
  if (!db || !isSupabaseConfigured()) {
    return NextResponse.json({ received: true, mode: "dev", type, action, id });
  }

  // Audit event (raw) — always store.
  await db.from("billing_events").insert({
    provider: "mercado_pago",
    event_type: type,
    status: action,
    provider_event_id: id,
    payload: payload as Record<string, unknown>,
  });

  // Payment events
  if (type === "payment" && id) {
    const payment = await fetchMercadoPagoPayment(id);
    if (!payment) return NextResponse.json({ received: true, type, action, id, fetched: false });

    const gpUserId = toStr(payment.metadata?.gp_user_id);
    const gpPlan = toStr(payment.metadata?.gp_plan) ?? "fundador";
    const providerSubId = toStr(payment.metadata?.preapproval_id);

    // Persist payment (idempotent by provider_payment_id).
    const cents = Math.round(Number(payment.transaction_amount ?? 0) * 100);
    const now = new Date().toISOString();

    const { data: sub } = gpUserId
      ? await db.from("subscriptions").select("id").eq("user_id", gpUserId).maybeSingle()
      : { data: null };

    await db.from("payments").insert({
      user_id: gpUserId,
      subscription_id: sub?.id ?? null,
      provider: "mercado_pago",
      provider_payment_id: String(payment.id),
      provider_subscription_id: providerSubId,
      amount_cents: cents,
      original_amount_cents: cents,
      discount_percent: 0,
      currency: payment.currency_id ?? "BRL",
      status: payment.status === "approved" ? "paid" : payment.status === "rejected" ? "failed" : "pending",
      paid_at: payment.status === "approved" ? now : null,
    });

    if (gpUserId && payment.status === "approved") {
      // Activate subscription (period 1 month) — keep existing schema semantics.
      const start = new Date();
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);

      await db.from("subscriptions").upsert(
        {
          user_id: gpUserId,
          plan: gpPlan,
          status: "active",
          provider: "mercado_pago",
          provider_payment_id: String(payment.id),
          provider_subscription_id: providerSubId,
          current_period_start: start.toISOString(),
          current_period_end: end.toISOString(),
        },
        { onConflict: "user_id" }
      );
    }

    return NextResponse.json({ received: true, type, action, id, fetched: true });
  }

  // Subscription (preapproval) events
  if ((type === "preapproval" || type === "subscription") && id) {
    const pre = await fetchMercadoPagoPreapproval(id);
    if (!pre) return NextResponse.json({ received: true, type, action, id, fetched: false });

    const gpUserId = toStr(pre.metadata?.gp_user_id);
    const gpPlan = toStr(pre.metadata?.gp_plan) ?? "fundador";

    if (gpUserId) {
      let status = "incomplete";
      if (pre.status === "authorized") status = "active";
      else if (pre.status === "paused") status = "past_due";
      else if (pre.status === "cancelled" || pre.status === "finished") status = "canceled";

      await db.from("subscriptions").upsert(
        {
          user_id: gpUserId,
          plan: gpPlan,
          status,
          provider: "mercado_pago",
          provider_subscription_id: pre.id,
          provider_customer_id: pre.payer_email ?? null,
        },
        { onConflict: "user_id" }
      );
    }

    return NextResponse.json({ received: true, type, action, id, fetched: true });
  }

  return NextResponse.json({ received: true, type, action, id });
}

