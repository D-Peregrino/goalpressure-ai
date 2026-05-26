"use client";

import Link from "next/link";
import { PlayCircle, Radio } from "lucide-react";

export default function ReplayEmptyState({
  onShowDemo,
}: {
  onShowDemo: () => void;
}) {
  return (
    <section className="gp-replay-empty-state" aria-labelledby="replay-empty-title">
      <div className="gp-replay-empty-state__glow" aria-hidden />
      <p className="gp-replay-empty-state__eyebrow">Replay histórico</p>
      <h3 id="replay-empty-title">Nenhum replay histórico disponível ainda</h3>
      <p className="gp-replay-empty-state__text">
        O sistema precisa monitorar partidas ao vivo por alguns ciclos para construir
        replays.
      </p>
      <div className="gp-replay-empty-state__actions">
        <Link href="/terminal" className="gp-replay-empty-state__btn gp-replay-empty-state__btn--primary">
          <Radio className="h-4 w-4" />
          Abrir terminal ao vivo
        </Link>
        <button
          type="button"
          className="gp-replay-empty-state__btn gp-replay-empty-state__btn--ghost"
          onClick={onShowDemo}
        >
          <PlayCircle className="h-4 w-4" />
          Ver demonstração de replay
        </button>
      </div>
    </section>
  );
}
