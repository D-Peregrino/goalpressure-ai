import { NextRequest, NextResponse } from "next/server";

/**
 * Checkout Stripe-ready — redireciona para signup/trial até billing estar ativo.
 */
export async function GET(req: NextRequest) {
  const plan = req.nextUrl.searchParams.get("plan") ?? "pro";
  const safe =
    plan === "pro" || plan === "institutional" || plan === "free" ? plan : "pro";

  const signup = new URL("/signup", req.nextUrl.origin);
  signup.searchParams.set("plan", safe);

  return NextResponse.redirect(signup);
}
