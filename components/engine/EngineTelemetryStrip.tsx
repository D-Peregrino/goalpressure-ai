"use client";

import { Gauge, Zap } from "lucide-react";
import type { LiveEngineSnapshot } from "@/types/engine";
import { ENGINE_STRIP } from "@/lib/ux/productCopy";

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
    <div className="gp-sport-stat-bar__cell">
      <p className="gp-sport-stat-bar__label">{label}</p>
      <p
        className={`gp-sport-stat-bar__value tabular-nums ${accent ? "gp-sport-stat-bar__value--accent" : ""}`}
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
      <div className="gp-sport-engine-strip">
        <p className="px-4 py-3 text-sm text-[rgba(148,163,184,0.9)] animate-pulse">
          {ENGINE_STRIP.loading}
        </p>
      </div>
    );
  }

  const strongest = engine?.strongestPressure;
  const momentum = engine?.highestMomentum;
  const topSignal = engine?.signals[0];
  const topEv = strongest?.expectedValue.over05;

  return (
    <div className="gp-sport-engine-strip">
      <div className="gp-sport-engine-strip__head">
        <Gauge className="h-3.5 w-3.5" />
        <span>{ENGINE_STRIP.title}</span>
      </div>
      <div className="gp-sport-engine-strip__grid">
        <Cell
          label={ENGINE_STRIP.strongestP}
          value={
            strongest ? String(Math.round(strongest.pressure.score)) : "—"
          }
          accent={Boolean(strongest && strongest.pressure.score >= 70)}
        />
        <Cell label={ENGINE_STRIP.level} value={strongest?.pressure.level ?? "—"} />
        <Cell
          label={ENGINE_STRIP.momentum}
          value={momentum ? String(momentum.momentum.momentumScore) : "—"}
        />
        <Cell
          label={ENGINE_STRIP.acceleration}
          value={
            momentum
              ? `${momentum.momentum.acceleration > 0 ? "+" : ""}${momentum.momentum.acceleration}`
              : "—"
          }
        />
        <Cell
          label={ENGINE_STRIP.signals}
          value={String(engine?.activeSignals ?? 0)}
          accent={(engine?.activeSignals ?? 0) > 0}
        />
        <Cell
          label={ENGINE_STRIP.topEv}
          value={topEv ? `${topEv.evPercent.toFixed(1)}%` : "—"}
        />
        <Cell
          label="Confiança"
          value={topSignal?.confidence ?? strongest?.pressure.confidence ?? "—"}
        />
        <Cell
          label={ENGINE_STRIP.queue}
          value={String(dispatchQueueSize || engine?.queueSize || 0)}
        />
      </div>
      {strongest && strongest.momentum.flags.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-white/[0.06] px-3 py-2">
          {strongest.momentum.flags.map((flag) => (
            <span
              key={flag}
              className="gp-sport-badge gp-sport-badge--sync"
            >
              <Zap className="h-2.5 w-2.5" />
              {flag.replace(/_/g, " ").toLowerCase()}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
