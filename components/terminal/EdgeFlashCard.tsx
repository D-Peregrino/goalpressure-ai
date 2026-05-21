"use client";

import { memo } from "react";

function EdgeFlashCardInner({
  edgePercent,
  fairOdd,
  market,
  evPlus,
}: {
  edgePercent: number | null;
  fairOdd: number | null;
  market: string | null;
  evPlus: boolean;
}) {
  const edge = edgePercent ?? 0;
  const hot = edge >= 3;

  return (
    <div className={`gp-edge-flash ${hot ? "gp-edge-flash--hot" : ""} ${evPlus ? "gp-edge-flash--ev" : ""}`}>
      <span className="gp-edge-flash__label">Edge</span>
      <span className="gp-edge-flash__value tabular-nums">
        {edgePercent != null ? `${edge.toFixed(1)}%` : "—"}
      </span>
      {fairOdd != null && fairOdd >= 1.01 && (
        <span className="gp-edge-flash__fair tabular-nums">fair {fairOdd.toFixed(2)}</span>
      )}
      {market && <span className="gp-edge-flash__market">{market}</span>}
      {evPlus && <span className="gp-edge-flash__badge">EV+</span>}
    </div>
  );
}

export default memo(EdgeFlashCardInner);
