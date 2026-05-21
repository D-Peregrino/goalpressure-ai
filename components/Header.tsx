import type { EngineStatus } from "@/types/domain";

interface HeaderProps {
  liveCount?: number;
  activeSignals?: number;
  latencyMs?: number;
  engineStatus?: EngineStatus;
}

export default function Header({
  liveCount = 0,
  activeSignals = 0,
  latencyMs,
  engineStatus = "ONLINE",
}: HeaderProps) {
  return (
    <header className="mb-5 border-b border-card/80 pb-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.35em] text-muted">
            Offensive Intelligence Layer
          </p>
          <h1 className="mt-1 font-mono text-xl font-bold uppercase tracking-[0.08em] text-foreground sm:text-2xl lg:text-[1.65rem]">
            Live Offensive Detection Engine
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-pressure animate-live-blink" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pressure">
            Stream Active
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <TelemetryCell label="Tracked Matches" value={String(liveCount)} />
        <TelemetryCell label="Active Signals" value={String(activeSignals)} accent />
        <TelemetryCell
          label="Latency"
          value={latencyMs !== undefined ? `${latencyMs}ms` : "—"}
        />
        <TelemetryCell label="Engine Status" value={engineStatus} accent />
      </div>
    </header>
  );
}

function TelemetryCell({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="telemetry-cell px-3 py-2.5">
      <p className="telemetry-label">{label}</p>
      <p
        className={`telemetry-value mt-0.5 ${accent ? "text-pressure" : "text-foreground"}`}
      >
        {value}
      </p>
    </div>
  );
}
