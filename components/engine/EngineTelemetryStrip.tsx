"use client";

import { Activity, Gauge, Target, TrendingUp, Zap } from "lucide-react";
import type { LiveEngineSnapshot } from "@/types/engine";

interface EngineTelemetryStripProps {
  engine: LiveEngineSnapshot | null;
  loading?: boolean;
  dispatchQueueSize?: number;
}

function Cell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="telemetry-cell px-3 py-2">
      <p className="telemetry-label">{label}</p>
      <p
        className={`telemetry-value tabular-nums ${accent ? "text-pressure" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

export default function EngineTelemetryStrip({
  engine,
  loading,
  dispatchQueueSize = 0,
}: EngineTelemetryStripProps) {
  if (loading && !engine) {
    return (
      <div className="mb-4 border border-card bg-surface/40 px-3 py-3">
        <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted animate-pulse-glow">
          Loading pressure engine…
        </p>
      </div>
    );
  }

  const strongest = engine?.strongestPressure;
  const momentum = engine?.highestMomentum;
  const topSignal = engine?.signals[0];
  const topEv = strongest?.expectedValue.over05;

  return (
    <div className="mb-4 border border-card bg-surface/60">
      <div className="flex items-center gap-2 border-b border-card/80 px-3 py-2">
        <Gauge className="h-3.5 w-3.5 text-pressure" />
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-pressure">
          Live Pressure Engine
        </span>
      </div>
      <div className="grid grid-cols-2 gap-0 sm:grid-cols-4 lg:grid-cols-8">
        <Cell
          label="Strongest P"
          value={
            strongest ? String(Math.round(strongest.pressure.score)) : "—"
          }
          accent={Boolean(strongest && strongest.pressure.score >= 70)}
        />
        <Cell
          label="Level"
          value={strongest?.pressure.level ?? "—"}
        />
        <Cell
          label="Momentum"
          value={
            momentum ? String(momentum.momentum.momentumScore) : "—"
          }
        />
        <Cell
          label="Acceleration"
          value={
            momentum
              ? `${momentum.momentum.acceleration > 0 ? "+" : ""}${momentum.momentum.acceleration}`
              : "—"
          }
        />
        <Cell
          label="Active Signals"
          value={String(engine?.activeSignals ?? 0)}
          accent={(engine?.activeSignals ?? 0) > 0}
        />
        <Cell
          label="EV (O0.5)"
          value={topEv ? `${topEv.evPercent.toFixed(1)}%` : "—"}
        />
        <Cell
          label="Confidence"
          value={topSignal?.confidence ?? strongest?.pressure.confidence ?? "—"}
        />
        <Cell
          label="Dispatch Q"
          value={String(dispatchQueueSize || engine?.queueSize || 0)}
        />
      </div>
      {strongest && strongest.momentum.flags.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-card/60 px-3 py-2">
          {strongest.momentum.flags.map((flag) => (
            <span
              key={flag}
              className="inline-flex items-center gap-1 border border-pressure/25 bg-pressure/5 px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider text-pressure/90"
            >
              <Zap className="h-2.5 w-2.5" />
              {flag.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      )}
      <div className="hidden border-t border-card/40 px-3 py-1 sm:flex sm:gap-4">
        <Activity className="h-3 w-3 text-muted/50" />
        <Target className="h-3 w-3 text-muted/50" />
        <TrendingUp className="h-3 w-3 text-muted/50" />
      </div>
    </div>
  );
}
