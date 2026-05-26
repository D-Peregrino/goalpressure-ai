"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import {
  COPA_PREMIUM_TO_TIER_FEATURE,
  type CopaPremiumFeature,
} from "@/lib/copa/copaAccess";
import { CUPOM_BARBOSATIPS75 } from "@/lib/subscription/plans";

const COPA_PAYWALL_SUB: Partial<Record<CopaPremiumFeature, string>> = {
  copa_gpi: "Ranking GPI ao vivo filtrado para jogos da Copa do Mundo.",
  copa_context: "Narrativa contextual, timeline e engines táticos por partida.",
  copa_telegram: "Alertas institucionais da Copa no Telegram.",
  copa_replay: "Replay minuto a minuto com evolução de pressão e GPI.",
  copa_ops: "OPS Center para operação institucional durante a Copa.",
};

export default function CopaPremiumGate({
  feature,
  children,
  preview,
  compact = false,
}: {
  feature: CopaPremiumFeature;
  children: ReactNode;
  preview?: ReactNode;
  compact?: boolean;
}) {
  const { can, isAdmin } = useSubscription();
  const tierFeature = COPA_PREMIUM_TO_TIER_FEATURE[feature];

  if (isAdmin || can(tierFeature)) {
    return <>{children}</>;
  }

  const sub = COPA_PAYWALL_SUB[feature] ?? "Leitura premium da Copa 2026.";

  return (
    <div
      className={`gp-copa-paywall ${compact ? "gp-copa-paywall--compact" : ""}`}
      data-copa-feature={feature}
    >
      <div className="gp-copa-paywall__preview" aria-hidden>
        {preview ?? children}
      </div>
      <div className="gp-copa-paywall__veil">
        <div className="gp-copa-paywall__card">
          <Lock className="gp-copa-paywall__icon" aria-hidden />
          <p className="gp-copa-paywall__title">
            Desbloqueie a leitura contextual da Copa 2026
          </p>
          <p className="gp-copa-paywall__sub">{sub}</p>
          <div className="gp-copa-paywall__actions">
            <Link
              href={`/cadastro?cupom=${CUPOM_BARBOSATIPS75}&origem=copa-${feature}`}
              className="gp-copa-btn gp-copa-btn--primary"
            >
              Entrar no Plano Fundador
            </Link>
            <Link href="/copa/alertas" className="gp-copa-btn">
              Ver alertas da Copa
            </Link>
            <Link href="/precos" className="gp-copa-btn">
              Comparar planos
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
