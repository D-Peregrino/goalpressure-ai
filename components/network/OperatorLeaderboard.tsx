"use client";

import type { OperatorProfile } from "@/lib/network/network.types";
import OperatorProfileCard from "@/components/network/OperatorProfileCard";

export default function OperatorLeaderboard({
  operators,
}: {
  operators: OperatorProfile[];
}) {
  if (!operators.length) {
    return <p className="gp-net-empty">Nenhum operador ranqueado ainda.</p>;
  }

  return (
    <section className="gp-net-panel">
      <header className="gp-net-panel__head">
        <h3>Leaderboard operacional</h3>
        <p>Precisão contextual · antecipação · leitura</p>
      </header>
      <div className="gp-net-leaderboard">
        {operators.slice(0, 6).map((op) => (
          <OperatorProfileCard key={op.userId} operator={op} />
        ))}
      </div>
    </section>
  );
}
