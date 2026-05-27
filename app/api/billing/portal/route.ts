import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { fetchUserSubscription } from "@/lib/billing/userSubscriptionStore";
import {
  createStripeBillingPortalSession,
  stripeConfigured,
} from "@/lib/billing/stripe";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  const base = request.nextUrl.origin;
  if (!user) {
    return NextResponse.redirect(`${base}/entrar?redirect=/billing`);
  }

  if (!stripeConfigured()) {
    return NextResponse.redirect(`${base}/billing?portal=unavailable`);
  }

  const sub = await fetchUserSubscription(user.id);
  const customerId = sub?.stripe_customer_id;
  if (!customerId) {
    return NextResponse.redirect(`${base}/billing?portal=no_customer`);
  }

  try {
    const url = await createStripeBillingPortalSession({
      stripeCustomerId: customerId,
      returnUrl: `${base}/billing`,
    });
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.redirect(`${base}/billing?portal=error`);
  }
}

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) {
    return NextResponse.json({ error: "Faça login." }, { status: 401 });
  }
  const sub = await fetchUserSubscription(user.id);
  if (!sub?.stripe_customer_id || !stripeConfigured()) {
    return NextResponse.json({ error: "Portal indisponível." }, { status: 400 });
  }
  const base = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const url = await createStripeBillingPortalSession({
    stripeCustomerId: sub.stripe_customer_id,
    returnUrl: `${base}/billing`,
  });
  return NextResponse.json({ ok: true, url });
}
