import { NextResponse } from "next/server";
import { DEV_USER_COOKIE } from "@/lib/auth/session";
import { clearSupabaseSessionCookies } from "@/lib/supabase/session-cookies";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(DEV_USER_COOKIE);
  return clearSupabaseSessionCookies(response);
}
