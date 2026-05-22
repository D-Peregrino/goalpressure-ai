import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyDevUser, devAuthEnabled } from "@/lib/auth/devStore";
import { DEV_USER_COOKIE } from "@/lib/auth/session";

export async function POST(request: Request) {
  if (!devAuthEnabled()) {
    return NextResponse.json({ error: "Use login via Supabase no cliente." }, { status: 400 });
  }

  const body = (await request.json()) as { email?: string; password?: string };
  const user = verifyDevUser(body.email ?? "", body.password ?? "");
  if (!user) {
    return NextResponse.json({ error: "E-mail ou senha inválidos." }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(DEV_USER_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({ ok: true });
}
