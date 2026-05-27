import { NextResponse } from "next/server";
import { constructStripeEvent } from "@/lib/billing/stripe";
import { handleStripeWebhookEvent } from "@/lib/billing/stripeWebhook";
import { logError, logInfo } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const payload = await request.text();

  try {
    const event = constructStripeEvent(payload, signature);
    await handleStripeWebhookEvent(event);
    logInfo("stripe", "Webhook processed", { type: event.type, id: event.id });
    return NextResponse.json({ received: true });
  } catch (error) {
    logError("stripe", "Webhook error", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook error" },
      { status: 400 }
    );
  }
}
