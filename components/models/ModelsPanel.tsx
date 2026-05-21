"use client";

import modelV1 from "@/config/models/model-v1.json";
import activeManifest from "@/config/models/active-model.json";
import { SIGNAL_DECISION_THRESHOLDS } from "@/lib/engine/signalDecisionEngine";
import { TELEGRAM_COOLDOWN_MS } from "@/lib/telegram/constants";
import { useBacktest } from "@/hooks/useBacktest";
import type { QuantitativeModel } from "@/types/model";

export default function ModelsPanel() {
  const model = modelV1 as QuantitativeModel;
  const { snapshot } = useBacktest();
  const activeId = activeManifest.activeModelId;

  const over05 = model.markets.OVER_0_5;
  const over15 = model.markets.OVER_1_5;

  return (
    <div className="space-y-6">
      <header>
        <p className="font-mono text-[9px] uppercase tracking-[0.35em] text-muted">
          Configuration (read-only)
        </p>
        <h1 className="mt-1 font-mono text-xl font-bold tracking-[0.12em] text-pressure">
          Model Config Panel
        </h1>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="module-panel p-4">
          <p className="telemetry-label">Active Model</p>
          <p className="font-mono text-lg font-bold text-pressure">{activeId}</p>
        </div>
        <div className="module-panel p-4">
          <p className="telemetry-label">Signal minPressure</p>
          <p className="font-mono text-lg">{SIGNAL_DECISION_THRESHOLDS.minPressureScore}</p>
        </div>
        <div className="module-panel p-4">
          <p className="telemetry-label">Signal minEV</p>
          <p className="font-mono text-lg">{SIGNAL_DECISION_THRESHOLDS.minEv}</p>
        </div>
        <div className="module-panel p-4">
          <p className="telemetry-label">Cooldown</p>
          <p className="font-mono text-lg">{TELEGRAM_COOLDOWN_MS / 60_000}m</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="module-panel p-4">
          <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            OVER 0.5 Thresholds
          </h2>
          <ul className="space-y-1 font-mono text-[10px] text-foreground/90">
            <li>minMinute: {over05.minMinute}</li>
            <li>maxMinute: {over05.maxMinute}</li>
            <li>minPressure: {over05.minPressure}</li>
            <li>minDangerousAttacks: {over05.minDangerousAttacks}</li>
            <li>minOdd: {over05.minOdd}</li>
          </ul>
        </div>
        <div className="module-panel p-4">
          <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            OVER 1.5 Thresholds
          </h2>
          <ul className="space-y-1 font-mono text-[10px] text-foreground/90">
            <li>minMinute: {over15.minMinute}</li>
            <li>maxMinute: {over15.maxMinute}</li>
            <li>minPressure: {over15.minPressure}</li>
            <li>minShots: {over15.minShots}</li>
            <li>minDangerousAttacks: {over15.minDangerousAttacks}</li>
            <li>minOdd: {over15.minOdd}</li>
          </ul>
        </div>
      </div>

      <div className="module-panel p-4">
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          Historical Performance (backtest)
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 font-mono text-[10px]">
          <div>
            <span className="text-muted">ROI</span>
            <p className="text-pressure">{(snapshot?.roi ?? 0).toFixed(2)}</p>
          </div>
          <div>
            <span className="text-muted">Hit rate</span>
            <p>{((snapshot?.hitRate ?? 0) * 100).toFixed(1)}%</p>
          </div>
          <div>
            <span className="text-muted">Avg EV</span>
            <p>{((snapshot?.averageEv ?? 0) * 100).toFixed(1)}%</p>
          </div>
          <div>
            <span className="text-muted">Drawdown</span>
            <p>{(snapshot?.maxDrawdown ?? 0).toFixed(2)}u</p>
          </div>
        </div>
        <p className="mt-3 font-mono text-[9px] text-muted">{model.description}</p>
      </div>
    </div>
  );
}
