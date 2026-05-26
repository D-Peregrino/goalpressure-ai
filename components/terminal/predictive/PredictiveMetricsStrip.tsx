"use client";

import { useEffect, useState } from "react";
import type { PredictiveEngineSnapshot } from "@/lib/predictive/predictive.types";

export default function PredictiveMetricsStrip() {
  const [data, setData] = useState<PredictiveEngineSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/autonomous/core", { cache: "no-store" });
        const body = await res.json();
        if (!cancelled && body?.predictiveEngine) {
          setData(body.predictiveEngine as PredictiveEngineSnapshot);
        }
      } catch {
        /* ignore */
      }
    };
    void load();
    const id = window.setInterval(load, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const m = data?.metrics;
  if (!m?.enabled) return null;

  return (
    <div className="gp-predictive-strip">
      <span className="gp-predictive-strip__label">Motor preditivo</span>
      <span>Leituras {m.predictiveReadings}</span>
      <span>Acertos {m.contextualHits}</span>
      <span>Antecipações {m.validAnticipations}</span>
      <span>Falsos positivos {m.falsePositives}</span>
      {m.sandboxMode ? <span className="gp-predictive-strip__sandbox">Sandbox</span> : null}
    </div>
  );
}
