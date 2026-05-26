"use client";

import type { OpsTacticalReplayItem } from "@/lib/ops/opsCenter.types";

export default function TacticalReplayStrip({
  items,
}: {
  items: OpsTacticalReplayItem[];
}) {
  if (!items.length) return null;

  return (
    <section className="gp-ops-replay-strip" aria-label="Tactical replay">
      <span className="gp-ops-replay-strip__label">Replay tático</span>
      <div className="gp-ops-replay-strip__track">
        {items.map((item, i) => (
          <div key={`${item.fixtureId}-${i}`} className="gp-ops-replay-card">
            <span className="gp-ops-replay-card__min">{item.minute}'</span>
            <strong>{item.matchLabel}</strong>
            <p>{item.note}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
