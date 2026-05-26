"use client";

import { useEffect, useState } from "react";
import type { AutonomousCoreSnapshot } from "@/lib/autonomous/autonomous.types";
import { regimeLabel } from "@/lib/autonomous/detectMarketRegime";
import { sensitivityLabel } from "@/lib/autonomous/calculateSignalSensitivity";
import { aggressionLabel } from "@/lib/autonomous/adjustOperationalAggression";

export default function AutonomousCorePanel() {
  const [snapshot, setSnapshot] = useState<AutonomousCoreSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/autonomous/core", { cache: "no-store" });
        const body = await res.json();
        if (!cancelled && body?.snapshot) setSnapshot(body.snapshot);
      } catch {
        /* ignore */
      }
    };
    void load();
    const id = window.setInterval(load, 25_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const t = snapshot?.activeThresholds;

  return (
    <section className="gp-autonomous-core">
      <header className="gp-autonomous-core__head">
        <h2 className="gp-type-title">Núcleo autônomo</h2>
        <span className="gp-sport-badge">ADAPTATIVO</span>
      </header>

      <div className="gp-autonomous-core__kpis">
        <div>
          <p className="gp-type-caption">Regime</p>
          <p className="gp-autonomous-core__value">
            {snapshot ? regimeLabel(snapshot.dominantRegime) : "—"}
          </p>
        </div>
        <div>
          <p className="gp-type-caption">Sensibilidade</p>
          <p className="gp-autonomous-core__value">
            {snapshot ? sensitivityLabel(snapshot.sensitivity) : "—"}
          </p>
        </div>
        <div>
          <p className="gp-type-caption">Agressividade</p>
          <p className="gp-autonomous-core__value">
            {snapshot ? aggressionLabel(snapshot.aggressionMode) : "—"}
          </p>
        </div>
        <div>
          <p className="gp-type-caption">FP risk</p>
          <p className="gp-autonomous-core__value tabular-nums">
            {snapshot?.avgFalsePositiveRisk ?? 0}%
          </p>
        </div>
        <div>
          <p className="gp-type-caption">Conf. adaptativa</p>
          <p className="gp-autonomous-core__value tabular-nums">
            {snapshot?.autonomousConfidence ?? 0}%
          </p>
        </div>
      </div>

      {t ? (
        <div className="gp-autonomous-core__thresholds">
          <p className="gp-type-caption">Thresholds ativos</p>
          <p className="gp-type-caption tabular-nums">
            P≥{t.minPressureScore} · EV≥{t.minEvPercent}% · Conf≥{t.minConfidence} · Urg≥
            {t.minUrgencyScore}
          </p>
        </div>
      ) : null}

      {snapshot?.selfCalibration && snapshot.selfCalibration.length > 0 ? (
        <div className="gp-autonomous-core__cal">
          <p className="gp-type-caption">Self-calibration</p>
          <ul>
            {snapshot.selfCalibration.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {snapshot?.alerts && snapshot.alerts.length > 0 ? (
        <div className="gp-autonomous-core__alerts">
          <p className="gp-type-caption">Alertas autônomos</p>
          <ul>
            {snapshot.alerts.slice(0, 4).map((a, i) => (
              <li key={`${a.type}-${i}`}>
                <strong>{a.headline}</strong>
                <span>{a.narrative}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
