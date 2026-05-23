"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import MarketingLayout from "@/components/layout/MarketingLayout";
import UpgradeCard from "@/components/billing/UpgradeCard";
import { PLANOS, formatarPreco, CUPOM_BARBOSATIPS75 } from "@/lib/subscription/plans";
import AppLoading from "@/components/layout/AppLoading";

function PrecosContent() {
  const params = useSearchParams();
  const cupom = params.get("cupom") ?? CUPOM_BARBOSATIPS75;

  return (
    <div className="gp-precos-page gp-precos-page--premium">
      <header className="gp-precos-page__header">
        <p className="gp-landing-eyebrow">Planos</p>
        <h1>Escolha como operar ao vivo</h1>
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
              <p className="tabular-nums">{formatarPreco(p.precoMensalCentavos)}/mês</p>
              <ul className="gp-precos-soon__list">
                {p.recursos.slice(0, 3).map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <span className="gp-precos-soon__badge">{p.badge ?? "Em breve"}</span>
            </article>
          ))}
        </div>
      </div>

      <p className="gp-precos-legal">
        GoalPressure é uma plataforma de leitura e análise esportiva. Não garante
        resultados financeiros.
      </p>
      <p className="text-center mt-6">
        <Link href="/terminal" className="gp-btn gp-btn--ghost">
          Explorar central grátis
        </Link>
      </p>
    </div>
  );
}

export default function PrecosPage() {
  return (
    <MarketingLayout narrow>
      <Suspense fallback={<AppLoading label="Carregando planos…" />}>
        <PrecosContent />
      </Suspense>
    </MarketingLayout>
  );
}
