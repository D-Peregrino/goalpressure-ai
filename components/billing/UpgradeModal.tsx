"use client";

import { useEffect } from "react";
import Link from "next/link";
import type { FeatureKey } from "@/lib/subscription/tiers";
import { FEATURE_LABELS } from "@/lib/subscription/commercialCopy";

export default function UpgradeModal({
  open,
  onClose,
  feature,
}: {
  open: boolean;
  onClose: () => void;
  feature?: FeatureKey;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const label = feature ? FEATURE_LABELS[feature] ?? feature : "recurso premium";

  return (
    <div className="gp-billing-modal-backdrop" role="dialog" aria-modal="true">
      <div className="gp-billing-modal">
        <h2>Upgrade necessário</h2>
        <p>
          <strong>{label}</strong> está disponível nos planos Starter, Pro e Founder.
          Assine para desbloquear acesso automático após o pagamento.
        </p>
        <div className="gp-billing-modal__actions">
          <button type="button" className="gp-billing-btn" onClick={onClose}>
            Fechar
          </button>
          <Link href="/billing" className="gp-billing-btn gp-billing-btn--primary" onClick={onClose}>
            Ver planos
          </Link>
        </div>
      </div>
    </div>
  );
}
