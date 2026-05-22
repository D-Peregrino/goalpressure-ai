import { NextResponse } from "next/server";
import { insertLead } from "@/lib/commercial/db";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { emailLead } from "@/lib/email/provider";

export const dynamic = "force-dynamic";

interface LeadBody {
  name?: string;
  email?: string;
  phone?: string;
  source?: string;
  interest?: string;
  message?: string;
  couponCode?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __GP_LEADS_DEV__: Array<
    LeadBody & { id: string; status?: string; createdAt: string }
  > | undefined;
}

function devLeadsStore() {
  if (!globalThis.__GP_LEADS_DEV__) globalThis.__GP_LEADS_DEV__ = [];
  return globalThis.__GP_LEADS_DEV__;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LeadBody;
    const email = body.email?.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ ok: false, error: "E-mail inválido." }, { status: 400 });
    }

    const payload = {
      name: body.name,
      email,
      phone: body.phone,
      source: body.source ?? "landing",
      interest: body.interest,
      message: body.message,
      couponCode: body.couponCode,
      utmSource: body.utmSource,
      utmMedium: body.utmMedium,
      utmCampaign: body.utmCampaign,
    };

    if (isSupabaseConfigured()) {
      const result = await insertLead(payload);
      if (!result.ok) {
        return NextResponse.json(
          { ok: false, error: "Não foi possível salvar. Tente novamente." },
          { status: 503 }
        );
      }
    } else {
      devLeadsStore().push({
        ...payload,
        id: `lead_${Date.now()}`,
        status: "new",
        createdAt: new Date().toISOString(),
      });
    }

    await emailLead(email);

    return NextResponse.json({
      ok: true,
      message: "Recebemos seu contato. Entraremos em breve.",
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Erro no servidor." }, { status: 500 });
  }
}
