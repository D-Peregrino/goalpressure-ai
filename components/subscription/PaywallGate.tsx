"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import {
  FEATURE_LABELS,
  FEATURE_REQUIRED_TIER,
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
  const { can } = useSubscription();

  if (can(feature)) {
    return <>{children}</>;
  }

  const required = FEATURE_REQUIRED_TIER[feature] ?? "pro";
  const label = title ?? FEATURE_LABELS[feature] ?? "Recurso Pro";
  const tierName = TIER_DISPLAY[required];

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
          <Link href={`${UPGRADE_PATH}?feature=${feature}`} className="gp-paywall__cta">
            {required === "institutional" ? "Conhecer Elite" : "Testar Pro grátis"}
          </Link>
        </div>
      </div>
    </div>
  );
}
