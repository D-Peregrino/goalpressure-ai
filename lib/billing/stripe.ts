/**
 * Stripe — scaffold. Defina STRIPE_SECRET_KEY e STRIPE_WEBHOOK_SECRET.
 */

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export async function createStripeCheckoutSession(_input: {
  amountCents: number;
  email: string;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
}): Promise<{ url: string; id: string } | null> {
  if (!stripeConfigured()) return null;
  // Integração futura: stripe.checkout.sessions.create(...)
  return null;
}

export function validateStripeWebhook(_payload: string, _signature: string): boolean {
  if (!process.env.STRIPE_WEBHOOK_SECRET?.trim()) return false;
  return false;
}
