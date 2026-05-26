"use client";

import type { ReactNode } from "react";
import PaywallGate from "@/components/subscription/PaywallGate";
import {
  COPA_PREMIUM_TO_TIER_FEATURE,
  type CopaPremiumFeature,
} from "@/lib/copa/copaAccess";

const COPA_PREMIUM_LABELS: Record<CopaPremiumFeature, string> = {
  copa_gpi: "GPI da Copa",
  copa_context: "Leitura contextual da Copa",
  copa_telegram: "Alertas Telegram — Copa",
  copa_replay: "Replay da Copa",
  copa_ops: "OPS Center — Copa",
};

export default function CopaPremiumGate({
  feature,
  children,
  preview,
  compact,
}: {
  feature: CopaPremiumFeature;
  children: ReactNode;
  preview?: ReactNode;
  compact?: boolean;
}) {
  const tierFeature = COPA_PREMIUM_TO_TIER_FEATURE[feature];
  return (
    <PaywallGate
      feature={tierFeature}
      title={COPA_PREMIUM_LABELS[feature]}
      preview={preview}
      compact={compact}
    >
      {children}
    </PaywallGate>
  );
}
