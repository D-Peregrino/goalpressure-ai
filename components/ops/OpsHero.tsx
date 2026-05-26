"use client";

import type { OpsCenterHero } from "@/lib/ops/opsCenter.types";

export default function OpsHero({
  hero,
  sandbox,
}: {
  hero: OpsCenterHero;
  sandbox?: boolean;
}) {
  return (
    <header className="gp-ops-hero">
      <div>
        <p className="gp-ops-hero__eyebrow">Live OPS Center</p>
        <h2 className="gp-ops-hero__title">Central operacional viva</h2>
        <p className="gp-ops-hero__sub">
          GPI · pressão · consenso · mercado · rede — visão unificada institucional.
        </p>
        {sandbox && <span className="gp-ops-hero__badge">Sandbox</span>}
      </div>
      <div className="gp-ops-hero__stats">
        <Stat label="Monitorados" value={hero.monitoredMatches} />
        <Stat label="Alertas ativos" value={hero.activeAlerts} accent />
        <Stat label="GPI médio" value={hero.avgGpi} />
        <Stat label="Pressão coletiva" value={hero.collectivePressure} />
        <Stat label="Consenso" value={hero.consensusScore} />
      </div>
    </header>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className={`gp-ops-stat ${accent ? "gp-ops-stat--accent" : ""}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
