import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DEV_USER_COOKIE } from "@/lib/auth/session";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(DEV_USER_COOKIE);
  return NextResponse.json({ ok: true });
}
