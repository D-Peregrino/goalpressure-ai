"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import PlanComparison from "@/components/subscription/PlanComparison";
import TrustStrip from "@/components/commercial/TrustStrip";
import { FEATURE_LABELS } from "@/lib/subscription/commercialCopy";
import type { FeatureKey } from "@/lib/subscription/tiers";

function UpgradeContent() {
  const params = useSearchParams();
  const feature = params.get("feature") as FeatureKey | null;
  const featureLabel = feature ? FEATURE_LABELS[feature] : null;

  return (
    <div className="gp-upgrade-page">
      <div className="gp-upgrade-page__inner">
        <Link href="/terminal" className="gp-upgrade-page__back">
          ← Voltar à central
        </Link>
        <header className="gp-upgrade-page__header">
          <p className="gp-landing-eyebrow">Assinatura</p>
          <h1 className="gp-upgrade-page__title">Desbloqueie a leitura completa</h1>
          {featureLabel ? (
            <p className="gp-upgrade-page__feature">
              Você tentou acessar: <strong>{featureLabel}</strong>
            </p>
          ) : (
            <p className="gp-upgrade-page__sub">
              Trial Pro em 7 dias · Elite com modo operador e auditoria
            </p>
          )}
        </header>
        <PlanComparison highlight="pro" />
        <TrustStrip />
        <p className="gp-upgrade-page__note">
          Pagamento via Stripe em breve. Hoje o trial ativa acesso demo na central.
        </p>
      </div>
    </div>
  );
}

export default function UpgradePage() {
  return (
    <Suspense fallback={<div className="gp-upgrade-page gp-upgrade-page--loading" />}>
      <UpgradeContent />
    </Suspense>
  );
}
