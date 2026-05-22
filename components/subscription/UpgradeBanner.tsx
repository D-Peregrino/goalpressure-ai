"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { UPGRADE_PATH } from "@/lib/subscription/commercialCopy";
import { TIERS } from "@/lib/subscription/tiers";

export default function UpgradeBanner() {
  const { tier } = useSubscription();

  if (tier !== "free") return null;

  return (
    <div className="gp-upgrade-banner" role="status">
      <Sparkles className="h-4 w-4 shrink-0 text-[var(--gp-red)]" aria-hidden />
      <p className="gp-upgrade-banner__text">
        Você está no <strong>{TIERS.free.name}</strong> — central limitada a{" "}
        {TIERS.free.limits.liveMatches} jogos. Ative o Plano Fundador para acesso completo.
      </p>
      <Link href={UPGRADE_PATH} className="gp-upgrade-banner__cta">
        Ver planos
      </Link>
    </div>
  );
}
