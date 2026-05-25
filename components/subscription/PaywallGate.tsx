"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import {
  FEATURE_LABELS,
  FEATURE_REQUIRED_PLAN,
  TIER_DISPLAY,
  UPGRADE_PATH,
} from "@/lib/subscription/commercialCopy";
import type { FeatureKey } from "@/lib/subscription/tiers";

export default function PaywallGate({
  feature,
  children,
  preview,
  title,
  compact = false,
}: {
  feature: FeatureKey;
  children: ReactNode;
  preview?: ReactNode;
  title?: string;
  compact?: boolean;
}) {
  const { can, isAdmin } = useSubscription();

  if (isAdmin || can(feature)) {
    return <>{children}</>;
  }

  const requiredPlan = FEATURE_REQUIRED_PLAN[feature] ?? "fundador";
  const label = title ?? FEATURE_LABELS[feature] ?? "Plano Fundador";
  const tierName = requiredPlan === "fundador" ? "Plano Fundador" : "Plano pago";

  return (
    <div
      className={`gp-paywall ${compact ? "gp-paywall--compact" : ""}`}
      data-feature={feature}
    >
      <div className="gp-paywall__preview" aria-hidden>
        {preview ?? children}
      </div>
      <div className="gp-paywall__veil">
        <div className="gp-paywall__card">
          <Lock className="gp-paywall__icon" aria-hidden />
          <p className="gp-paywall__title">{label}</p>
          <p className="gp-paywall__sub">
            Disponível no plano <strong>{tierName}</strong>
          </p>
          <Link href={`${UPGRADE_PATH}?recurso=${feature}`} className="gp-paywall__cta">
            Ver Plano Fundador
          </Link>
        </div>
      </div>
    </div>
  );
}
