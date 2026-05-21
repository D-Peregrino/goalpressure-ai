import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface WaitlistEntry {
  email: string;
  plan?: string;
  createdAt: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __GP_WAITLIST__: WaitlistEntry[] | undefined;
}

function getStore(): WaitlistEntry[] {
  if (!globalThis.__GP_WAITLIST__) {
    globalThis.__GP_WAITLIST__ = [];
  }
  return globalThis.__GP_WAITLIST__;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as { email?: string; plan?: string };
    const email = body.email?.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
    }

    const store = getStore();
    if (!store.some((e) => e.email === email)) {
      store.push({
        email,
        plan: body.plan,
        createdAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      ok: true,
      position: store.length,
      message: "Inscrição registrada. Entraremos em contato.",
    });
  } catch {
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

export async function GET(): Promise<NextResponse> {
  const store = getStore();
  return NextResponse.json({
    ok: true,
    count: store.length,
  });
}
