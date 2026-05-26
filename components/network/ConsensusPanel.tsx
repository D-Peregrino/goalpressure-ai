"use client";

import { marketConsensusLabel } from "@/lib/network/marketConsensus";
import type { CollectiveContext } from "@/lib/network/network.types";

export default function ConsensusPanel({
  contexts,
  hotLeagues,
}: {
  contexts: CollectiveContext[];
  hotLeagues?: { league: string; heat: number }[];
}) {
  return (
    <section className="gp-net-panel">
      <header className="gp-net-panel__head">
        <h3>Consenso contextual</h3>
        <p>Convergência operacional entre observadores</p>
      </header>

      {hotLeagues && hotLeagues.length > 0 && (
        <div className="gp-net-hot-leagues">
          {hotLeagues.map((l) => (
            <span key={l.league} className="gp-net-chip">
              {l.league} · {l.heat}
            </span>
          ))}
        </div>
      )}

      <ul className="gp-net-consensus-list">
        {contexts.slice(0, 8).map((c) => (
          <li key={c.fixtureId} className="gp-net-consensus-row">
            <div>
              <strong>{c.matchLabel}</strong>
              <span>{c.league ?? "—"} · {c.observerCount} obs.</span>
            </div>
            <div className="gp-net-consensus-row__scores">
              <span className="gp-net-score" data-tier={scoreTier(c.consensusScore)}>
                {c.consensusScore}
              </span>
              <span className="gp-net-score-label">{marketConsensusLabel(c.consensusScore)}</span>
              <span className="gp-net-pressure">Pressão {c.collectivePressure}</span>
            </div>
          </li>
        ))}
      </ul>
      {!contexts.length && <p className="gp-net-empty">Sem convergência detectada.</p>}
    </section>
  );
}

function scoreTier(score: number): string {
  if (score >= 80) return "high";
  if (score >= 55) return "mid";
  return "low";
}
