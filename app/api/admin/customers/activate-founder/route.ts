import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireUser";
import { activateFundadorManualAdmin } from "@/lib/commercial/db";
import { devAuthEnabled, findDevUserById, updateDevUserPlan } from "@/lib/auth/devStore";
import { logInfo, logWarn } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

const LOG_SCOPE = "api-admin-activate-founder";

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Acesso negado." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { userId?: string };
    const userId = body.userId?.trim();

    if (!userId) {
      return NextResponse.json({ ok: false, error: "userId é obrigatório." }, { status: 400 });
    }

    logInfo(LOG_SCOPE, "liberação manual fundador", {
      userId,
      admin: admin.email,
    });

    if (devAuthEnabled()) {
      const user = updateDevUserPlan(userId, "fundador", { status: "active" });
      if (!user) {
        return NextResponse.json({ ok: false, error: "Cliente não encontrado." }, { status: 404 });
      }
      return NextResponse.json({
        ok: true,
        mode: "dev",
        userId,
        plan: "fundador",
        status: "active",
        provider: "manual",
        message: "Plano Fundador liberado (modo desenvolvimento).",
      });
    }

    const result = await activateFundadorManualAdmin({
      userId,
      adminId: admin.id,
      adminEmail: admin.email,
    });

    if (!result.ok) {
      logWarn(LOG_SCOPE, "falha", { error: result.error });
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 12);

    return NextResponse.json({
      ok: true,
      userId,
      subscriptionId: result.subscriptionId,
      plan: "fundador",
      status: "active",
      provider: "manual",
      currentPeriodEnd: periodEnd.toISOString(),
      message: "Plano Fundador liberado por 12 meses.",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro interno.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
