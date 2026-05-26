import { NextResponse } from "next/server";
import { getCopaDatasetCached } from "@/lib/copa/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getCopaDatasetCached();
    return NextResponse.json(
      { ok: true, data },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao carregar Copa";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
