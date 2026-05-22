"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import UpgradeCard from "@/components/billing/UpgradeCard";
import { PLANOS, formatarPreco, CUPOM_BARBOSATIPS75 } from "@/lib/subscription/plans";

function PrecosContent() {
  const params = useSearchParams();
  const cupom = params.get("cupom") ?? CUPOM_BARBOSATIPS75;

  return (
    <div className="gp-precos-page">
      <div className="gp-precos-page__inner">
        <Link href="/" className="gp-precos-page__back">
          ← Início
        </Link>
        <header className="gp-precos-page__header">
          <h1>Planos GoalPressure</h1>
          <p>Plano Fundador disponível agora. Demais planos em breve.</p>
        </header>

        <div className="gp-precos-grid">
          <div className="gp-precos-grid__main">
            <UpgradeCard initialCoupon={cupom} />
          </div>
          <div className="gp-precos-grid__side">
            {PLANOS.filter((p) => p.id !== "fundador").map((p) => (
              <article key={p.id} className="gp-precos-soon">
                <h3>{p.nome}</h3>
                <p>{formatarPreco(p.precoMensalCentavos)}/mês</p>
                <span className="gp-precos-soon__badge">{p.badge ?? "Em breve"}</span>
              </article>
            ))}
          </div>
        </div>

        <p className="gp-precos-legal">
          GoalPressure é uma plataforma de leitura e análise esportiva. Não garante
          resultados financeiros.
        </p>
      </div>
    </div>
  );
}

export default function PrecosPage() {
  return (
    <Suspense fallback={<div className="gp-precos-page">Carregando…</div>}>
      <PrecosContent />
    </Suspense>
  );
}
