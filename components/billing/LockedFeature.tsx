"use client";

import Link from "next/link";
import type { FeatureKey } from "@/lib/subscription/tiers";
import { FEATURE_LABELS } from "@/lib/subscription/commercialCopy";
import { useSubscription } from "@/hooks/useSubscription";

export default function LockedFeature({
  feature,
  children,
  preview,
}: {
  feature: FeatureKey;
  children: React.ReactNode;
  preview?: React.ReactNode;
}) {
  const { can, isAdmin } = useSubscription();
  if (isAdmin || can(feature)) return <>{children}</>;

  const label = FEATURE_LABELS[feature] ?? "Recurso do Plano Fundador";

  return (
    <div className="gp-locked-feature">
      <div className="gp-locked-feature__preview" aria-hidden>
        {preview ?? children}
      </div>
      <div className="gp-locked-feature__veil">
        <p className="gp-locked-feature__title">{label}</p>
        <p className="gp-locked-feature__sub">Disponível no Plano Fundador</p>
        <Link href="/precos" className="gp-btn gp-btn--primary gp-btn--sm">
          Ver plano fundador
        </Link>
      </div>
    </div>
  );
}
