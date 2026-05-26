"use client";

import type { ReplayFrame } from "@/lib/replay/replayEngine";

export default function ReplayContextLayer({ frame }: { frame: ReplayFrame | null }) {
  if (!frame) return null;

  return (
    <section className="gp-replay-panel">
      <header className="gp-replay-panel__head">
        <h3>Context layer</h3>
        <p>Narrativa contextual e alertas autônomos</p>
      </header>

      <div className="gp-replay-context-grid">
        <div>
          <span>Status</span>
          <strong>{frame.context?.statusOperacional ?? "—"}</strong>
        </div>
        <div>
          <span>Nível contexto</span>
          <strong>{frame.context?.contextLevel ?? "—"}</strong>
        </div>
        <div>
          <span>Predição</span>
          <strong>{frame.predictive?.predictiveLevel ?? "—"}</strong>
        </div>
        <div>
          <span>Break prob.</span>
          <strong>
            {Math.round((frame.predictive?.breakProbability ?? 0) * 100)}%
          </strong>
        </div>
      </div>

      <p className="gp-replay-narrative">
        {frame.context?.narrative ??
          frame.predictive?.narrative ??
          "Sem narrativa para este minuto."}
      </p>

      <div className="gp-replay-alerts">
        <h4>Telegram events</h4>
        {frame.alerts.length ? (
          frame.alerts.map((alert, idx) => (
            <p key={`${alert.recordedAt}-${idx}`}>
              <strong>{alert.priority.toUpperCase()}</strong> ·{" "}
              {alert.headline ?? alert.alertKind}
            </p>
          ))
        ) : (
          <p className="gp-replay-empty">Sem alertas neste minuto.</p>
        )}
      </div>
    </section>
  );
}
