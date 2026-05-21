"use client";

import { memo } from "react";

function cellsFromSeries(points: number[] | undefined, cols = 8, rows = 4): number[] {
  const flat: number[] = [];
  const src = points ?? [];
  for (let i = 0; i < cols * rows; i++) {
    flat.push(src[src.length - cols * rows + i] ?? 0);
  }
  const max = Math.max(1, ...flat.map(Math.abs));
  return flat.map((v) => Math.round((Math.max(0, v) / max) * 100));
}

function MiniPressureHeatmapInner({
  points,
  locked,
}: {
  points?: number[];
  locked?: boolean;
}) {
  const intensities = cellsFromSeries(points);

  return (
    <div className={`gp-mini-heatmap ${locked ? "gp-mini-heatmap--locked" : ""}`}>
      <p className="gp-mini-heatmap__label">Pressão · heat</p>
      <div className="gp-mini-heatmap__grid" aria-hidden={locked}>
        {intensities.map((intensity, i) => (
          <span
            key={i}
            className="gp-mini-heatmap__cell"
            style={{
              background: `rgba(255, 43, 43, ${Math.max(0.05, intensity / 100)})`,
            }}
          />
        ))}
      </div>
      {locked && <span className="gp-mini-heatmap__lock">Pro</span>}
    </div>
  );
}

export default memo(MiniPressureHeatmapInner);
