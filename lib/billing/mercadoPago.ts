/**
 * Mercado Pago — scaffold. Defina MERCADO_PAGO_ACCESS_TOKEN.
 */

export function mercadoPagoConfigured(): boolean {
  return Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim());
}

export async function createMercadoPagoPreference(_input: {
  amountCents: number;
  email: string;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
}): Promise<{ url: string; id: string } | null> {
  if (!mercadoPagoConfigured()) return null;
  return null;
}
