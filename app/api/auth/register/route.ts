import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createDevUser, devAuthEnabled } from "@/lib/auth/devStore";
import { DEV_USER_COOKIE } from "@/lib/auth/session";
import { emailBoasVindas } from "@/lib/email/provider";

export async function POST(request: Request) {
  if (!devAuthEnabled()) {
    return NextResponse.json(
      { error: "Use Supabase Auth (configure NEXT_PUBLIC_SUPABASE_URL e ANON_KEY)." },
      { status: 400 }
    );
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
    };
    const email = body.email?.trim();
    const password = body.password ?? "";
    const name = body.name?.trim() ?? "";

    if (!email || !email.includes("@") || password.length < 6) {
      return NextResponse.json(
        { error: "Informe e-mail válido e senha com pelo menos 6 caracteres." },
        { status: 400 }
      );
    }

    const user = createDevUser({ email, password, name });
    const cookieStore = await cookies();
    cookieStore.set(DEV_USER_COOKIE, user.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    await emailBoasVindas(user.email, user.name || "Cliente");

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao cadastrar." },
      { status: 400 }
    );
  }
}
