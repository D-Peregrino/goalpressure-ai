"use client";

import Link from "next/link";
import PlanBadge from "@/components/billing/PlanBadge";
import { useSubscription } from "@/hooks/useSubscription";
import { formatarPreco, PLANO_FUNDADOR_CENTAVOS } from "@/lib/subscription/plans";
import { aplicarCupom } from "@/lib/subscription/coupons";
import { planLabelPt } from "@/lib/subscription/permissions";

export default function BillingSummary() {
  const { plan, subscriptionStatus, couponCode } = useSubscription();
  const cupom = couponCode ? aplicarCupom(couponCode) : null;

  return (
    <section className="gp-billing-summary">
      <h2 className="gp-billing-summary__title">Assinatura</h2>
      <div className="gp-billing-summary__row">
        <span>Plano atual</span>
        <PlanBadge plan={plan} />
      </div>
      <div className="gp-billing-summary__row">
        <span>Status</span>
        <span>{statusPt(subscriptionStatus)}</span>
      </div>
      {plan === "fundador" && cupom && (
        <>
          <div className="gp-billing-summary__row">
            <span>Valor original</span>
            <span>{formatarPreco(PLANO_FUNDADOR_CENTAVOS)}/mês</span>
          </div>
          <div className="gp-billing-summary__row">
            <span>Cupom {cupom.nomeAmigavel}</span>
            <span>-{cupom.descontoPercent}%</span>
          </div>
          <div className="gp-billing-summary__row gp-billing-summary__row--destaque">
            <span>Valor final</span>
            <strong>{formatarPreco(cupom.valorFinalCentavos)}/mês</strong>
          </div>
        </>
      )}
      {plan === "free" && (
        <Link href="/precos" className="gp-btn gp-btn--primary">
          Ativar Plano Fundador
        </Link>
      )}
      {plan === "fundador" && (
        <Link href="/api/billing/portal" className="gp-btn gp-btn--secondary">
          Gerenciar assinatura
        </Link>
      )}
    </section>
  );
}

function statusPt(s: string): string {
  const map: Record<string, string> = {
    active: "Ativa",
    trialing: "Em teste",
    past_due: "Pagamento pendente",
    canceled: "Cancelada",
    incomplete: "Incompleta",
  };
  return map[s] ?? s;
}
