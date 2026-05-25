import { NextResponse } from "next/server";
import { fetchGlobalFeed } from "@/lib/dashboard/globalFeed";

export const dynamic = "force-dynamic";

export async function GET() {
  const feed = await fetchGlobalFeed(8);
  return NextResponse.json({ ok: true, feed });
}
