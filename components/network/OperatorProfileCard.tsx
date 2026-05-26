"use client";

import type { OperatorProfile } from "@/lib/network/network.types";

export default function OperatorProfileCard({ operator }: { operator: OperatorProfile }) {
  return (
    <article className="gp-net-op-card">
      <header className="gp-net-op-card__head">
        <span className="gp-net-op-card__rank">#{operator.rank ?? "—"}</span>
        <div>
          <strong>{operator.displayName}</strong>
          <span className="gp-net-op-card__rep">Rep. {operator.reputationScore}</span>
        </div>
      </header>
      <div className="gp-net-op-card__bars">
        <MetricBar label="Precisão" value={operator.precisionScore} />
        <MetricBar label="Antecipação" value={operator.anticipationScore} />
        <MetricBar label="Participação" value={operator.participationScore} />
        <MetricBar label="Confiabilidade" value={operator.reliabilityScore} />
      </div>
      <footer className="gp-net-op-card__foot">
        <span>{operator.signalsCount} sinais</span>
        <span>FP {operator.falsePositiveRate}%</span>
        <span>{operator.votesReceived} votos</span>
      </footer>
    </article>
  );
}

function MetricBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="gp-net-metric">
      <div className="gp-net-metric__row">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="gp-net-metric__track">
        <div className="gp-net-metric__fill" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
