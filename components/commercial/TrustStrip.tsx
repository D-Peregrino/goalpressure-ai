"use client";

import Link from "next/link";
import { Shield } from "lucide-react";
import { TRUST_METRICS } from "@/lib/subscription/commercialCopy";

export default function TrustStrip() {
  return (
    <section className="gp-trust-strip" aria-label="Confiança do sistema">
      <header className="gp-trust-strip__head">
        <Shield className="h-4 w-4" aria-hidden />
        <div>
          <p className="gp-type-title gp-trust-strip__title">Por que confiar na leitura</p>
          <p className="gp-type-caption gp-trust-strip__sub">
            Métricas internas de validação —{" "}
            <Link href="/validation" className="gp-trust-strip__link">
              ver precisão
            </Link>
          </p>
        </div>
      </header>
      <div className="gp-trust-strip__metrics">
        {TRUST_METRICS.map((m) => (
          <div key={m.label} className="gp-trust-strip__metric">
            <p className="gp-trust-strip__value tabular-nums">{m.value}</p>
            <p className="gp-trust-strip__label">{m.label}</p>
            <p className="gp-trust-strip__sub-m">{m.sub}</p>
          </div>
        ))}
      </div>
      <p className="gp-trust-strip__human">
        O GoalPressure combina placar ao vivo, pressão ofensiva e leitura de mercado numa
        narrativa única — para você decidir rápido, sem painel técnico.
      </p>
    </section>
  );
}
