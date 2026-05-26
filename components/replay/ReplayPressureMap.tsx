"use client";

import type { ReplayDataset } from "@/lib/replay/replayEngine";

export default function ReplayPressureMap({
  dataset,
  currentMinute,
}: {
  dataset: ReplayDataset;
  currentMinute: number;
}) {
  const points = dataset.frames.filter((f) => f.snapshot).slice(-90);
  const maxPressure = Math.max(1, ...points.map((p) => p.snapshot?.pressureScore ?? 0));

  return (
    <section className="gp-replay-panel">
      <header className="gp-replay-panel__head">
        <h3>Pressure evolution</h3>
        <p>Evolução minuto a minuto da pressão e GPI</p>
      </header>
      <div className="gp-replay-pressure">
        {points.map((point) => {
          const pressure = point.snapshot?.pressureScore ?? 0;
          const height = Math.max(8, Math.round((pressure / maxPressure) * 100));
          return (
            <div
              key={`${point.fixtureId}-${point.minute}`}
              className={`gp-replay-pressure__bar ${
                point.minute <= currentMinute ? "active" : ""
              }`}
              style={{ height: `${height}%` }}
              title={`${point.minute}' · pressão ${Math.round(pressure)} · GPI ${point.gpiScore}`}
            />
          );
        })}
      </div>
    </section>
  );
}
