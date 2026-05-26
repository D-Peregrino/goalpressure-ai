"use client";

import type { QuantTimelinePoint } from "@/lib/admin/quant/quant.types";
import { QuantPanelShell } from "./QuantPanelShell";

export default function AdaptiveLearningTimeline({
  timeline,
}: {
  timeline: QuantTimelinePoint[];
}) {
  const max = Math.max(
    1,
    ...timeline.flatMap((t) => [t.gpi, t.predictive, t.contextual, t.adaptive])
  );

  return (
    <QuantPanelShell
      title="Timeline adaptativa"
      subtitle="Evolução de GPI, preditivo, contextual, adaptive e thresholds"
    >
      {timeline.length === 0 ? (
        <p className="gp-quant-muted">Aguardando pontos de calibração</p>
      ) : (
        <div className="gp-quant-timeline">
          {timeline.map((point) => (
            <div key={point.at} className="gp-quant-timeline__row">
              <time>{new Date(point.at).toLocaleString("pt-BR")}</time>
              <div className="gp-quant-timeline__bars">
                <TimelineBar label="GPI" value={point.gpi} max={max} color="#1e3a5f" />
                <TimelineBar label="Preditivo" value={point.predictive} max={max} color="#2563eb" />
                <TimelineBar label="Contextual" value={point.contextual} max={max} color="#0f766e" />
                <TimelineBar label="Adaptive" value={point.adaptive} max={max} color="#7c3aed" />
              </div>
              <span className="gp-quant-timeline__threshold">
                Threshold contexto · {point.thresholdContext}
              </span>
            </div>
          ))}
        </div>
      )}
    </QuantPanelShell>
  );
}

function TimelineBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  return (
    <div className="gp-quant-timeline__bar">
      <span>{label}</span>
      <div className="gp-quant-timeline__track">
        <span style={{ width: `${(value / max) * 100}%`, background: color }} />
      </div>
      <strong>{value}</strong>
    </div>
  );
}
