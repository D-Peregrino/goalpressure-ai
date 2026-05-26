"use client";

import Link from "next/link";
import type { OpsCenterHero } from "@/lib/ops/opsCenter.types";

export default function LiveConsensusLayer({
  hero,
}: {
  hero: OpsCenterHero;
}) {
  const tier =
    hero.consensusScore >= 75 ? "strong" : hero.consensusScore >= 50 ? "moderate" : "low";

  return (
    <section className="gp-ops-panel gp-ops-consensus-layer">
      <header className="gp-ops-panel__head">
        <h3>Camada de consenso ao vivo</h3>
        <p>Signal Exchange + meta-consenso institucional</p>
      </header>
      <div className="gp-ops-consensus-layer__gauge" data-tier={tier}>
        <span className="gp-ops-consensus-layer__score">{hero.consensusScore}</span>
        <span>consenso médio</span>
      </div>
      <div className="gp-ops-consensus-layer__grid">
        <div>
          <strong>{hero.collectivePressure}</strong>
          <span>Pressão coletiva</span>
        </div>
        <div>
          <strong>{hero.avgGpi}</strong>
          <span>GPI médio</span>
        </div>
        <div>
          <strong>{hero.monitoredMatches}</strong>
          <span>Jogos monitorados</span>
        </div>
      </div>
      <Link href="/network" className="gp-ops-link">
        Abrir Signal Exchange →
      </Link>
    </section>
  );
}
