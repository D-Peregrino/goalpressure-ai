/**
 * Mercado Pago — recurring subscriptions (preapproval) + webhook validation.
 * Environment:
 * - MERCADOPAGO_ACCESS_TOKEN
 * - MERCADOPAGO_WEBHOOK_SECRET
 */

import crypto from "crypto";

const MP_API = "https://api.mercadopago.com";

export function mercadoPagoConfigured(): boolean {
  return Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim());
}

function accessToken(): string | null {
  return process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim() || null;
}

export type MercadoPagoPreapprovalStatus =
  | "pending"
  | "authorized"
  | "paused"
  | "cancelled"
  | "finished"
  | "unknown";

export interface MercadoPagoPreapproval {
  id: string;
  status: string;
  payer_email?: string;
  external_reference?: string;
  reason?: string;
  auto_recurring?: {
    frequency?: number;
    frequency_type?: string;
    transaction_amount?: number;
    currency_id?: string;
  };
  metadata?: Record<string, unknown>;
  init_point?: string;
}

export interface MercadoPagoPayment {
  id: number;
  status: string;
  status_detail?: string;
  transaction_amount?: number;
  currency_id?: string;
  external_reference?: string;
  metadata?: Record<string, unknown>;
  payer?: { email?: string };
}

async function mpFetch<T>(
  path: string,
  init?: RequestInit
): Promise<{ ok: boolean; data?: T; error?: string; status?: number }> {
  const token = accessToken();
  if (!token) return { ok: false, error: "missing_access_token" };

  try {
    const res = await fetch(`${MP_API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
    const status = res.status;
    const json = (await res.json().catch(() => null)) as T | null;
    if (!res.ok || !json) {
      return { ok: false, status, error: `HTTP ${status}` };
    }
    return { ok: true, data: json, status };
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    return { ok: false, error: message };
  }
}

export async function createMercadoPagoRecurringPreapproval(input: {
  amountCents: number;
  currency: "BRL";
  email: string;
  successUrl: string;
  failureUrl: string;
  pendingUrl: string;
  reason: string;
  externalReference: string;
  metadata: Record<string, unknown>;
}): Promise<{ url: string; id: string } | null> {
  if (!mercadoPagoConfigured()) return null;

  const body = {
    reason: input.reason,
    external_reference: input.externalReference,
    payer_email: input.email,
    back_url: input.successUrl,
    status: "pending",
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      transaction_amount: Math.round(input.amountCents) / 100,
      currency_id: input.currency,
    },
    metadata: input.metadata,
  };

  const res = await mpFetch<MercadoPagoPreapproval>("/preapproval", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.data?.init_point || !res.data?.id) return null;

  return { url: res.data.init_point, id: res.data.id };
}

export async function fetchMercadoPagoPreapproval(
  id: string
): Promise<MercadoPagoPreapproval | null> {
  const res = await mpFetch<MercadoPagoPreapproval>(`/preapproval/${encodeURIComponent(id)}`, {
    method: "GET",
  });
  return res.ok ? res.data ?? null : null;
}

export async function fetchMercadoPagoPayment(id: string): Promise<MercadoPagoPayment | null> {
  const res = await mpFetch<MercadoPagoPayment>(`/v1/payments/${encodeURIComponent(id)}`, {
    method: "GET",
  });
  return res.ok ? res.data ?? null : null;
}

function safeEq(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/**
 * Webhook signature validation per Mercado Pago docs (x-signature + x-request-id).
 * Manifest: `id:[data.id];request-id:[x-request-id];ts:[ts];`
 */
export function validateMercadoPagoWebhook(input: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
  secret: string | null;
}): boolean {
  const secret = input.secret?.trim();
  if (!secret) return false;
  if (!input.xSignature || !input.xRequestId || !input.dataId) return false;

  const parts = input.xSignature.split(",").map((s) => s.trim());
  const ts = parts.find((p) => p.startsWith("ts="))?.slice(3) ?? null;
  const v1 = parts.find((p) => p.startsWith("v1="))?.slice(3) ?? null;
  if (!ts || !v1) return false;

  const manifest = `id:${input.dataId};request-id:${input.xRequestId};ts:${ts};`;
  const digest = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  return safeEq(digest, v1);
}
