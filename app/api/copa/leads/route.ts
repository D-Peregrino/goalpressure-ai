import { NextResponse } from "next/server";
import { insertCopaLead } from "@/lib/copa/copaLeadsDb";

export const dynamic = "force-dynamic";

interface CopaLeadBody {
  name?: string;
  email?: string;
  telegram?: string;
  source?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CopaLeadBody;
    const email = body.email?.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ ok: false, error: "E-mail inválido." }, { status: 400 });
    }

    const result = await insertCopaLead({
      name: body.name,
      email,
      telegram: body.telegram,
      source: body.source ?? "copa",
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: "Não foi possível registrar. Tente novamente." },
        { status: 503 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Inscrição recebida. Você será avisado sobre alertas da Copa.",
      id: result.id,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Erro no servidor." }, { status: 500 });
  }
}
