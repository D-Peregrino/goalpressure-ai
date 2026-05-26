"use client";

import type { ReplayFrame } from "@/lib/replay/replayEngine";

export default function ReplayMatchCard({ frame }: { frame: ReplayFrame | null }) {
  if (!frame?.snapshot) {
    return <div className="gp-replay-card">Aguardando snapshot...</div>;
  }

  const s = frame.snapshot;

  return (
    <article className="gp-replay-card">
      <header>
        <span>{s.league}</span>
        <span>{frame.minute}'</span>
      </header>
      <div className="gp-replay-card__teams">
        <strong>{s.homeTeam}</strong>
        <strong>
          {s.homeScore} - {s.awayScore}
        </strong>
        <strong>{s.awayTeam}</strong>
      </div>
      <div className="gp-replay-card__metrics">
        <Metric label="Pressão" value={Math.round(s.pressureScore)} />
        <Metric label="GPI" value={frame.gpiScore} />
        <Metric label="Consenso" value={frame.consensusScore} />
        <Metric label="Mercado" value={frame.marketLagScore} />
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="gp-replay-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
