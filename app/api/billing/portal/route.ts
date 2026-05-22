import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await requireUser();
  const base = request.nextUrl.origin;
  if (!user) {
    return NextResponse.redirect(`${base}/entrar`);
  }

  if (process.env.STRIPE_SECRET_KEY?.trim()) {
    // TODO: stripe.billingPortal.sessions.create
    return NextResponse.redirect(`${base}/conta?portal=em_breve`);
  }

  return NextResponse.redirect(`${base}/conta`);
}
