"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  Clock,
  Database,
  Radio,
  Wifi,
} from "lucide-react";
import type { LiveMatchFeedStatus, LiveMatchSource } from "@/hooks/useLiveMatches";

interface OperationalBarProps {
  trackedCount: number;
  activeSignals: number;
  dataSource: LiveMatchSource;
  feedStatus: LiveMatchFeedStatus;
  apiLatencyMs?: number;
  lastUpdated?: number;
  signalActivity?: number;
}

function formatLastUpdate(ts?: number): string {
  if (!ts) return "—";
  const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (sec < 2) return "NOW";
  if (sec < 60) return `${sec}s AGO`;
  return `${Math.floor(sec / 60)}m AGO`;
}

function dataSourceLabel(source: LiveMatchSource): string {
  return source === "sportmonks" ? "LIVE DATA" : "MOCK FALLBACK";
}

function feedStatusSuffix(status: LiveMatchFeedStatus): string {
  if (status === "stale") return " · STALE";
  if (status === "loading") return " · SYNC";
  if (status === "error") return " · ERR";
  return "";
}

export default function OperationalBar({
  trackedCount,
  activeSignals,
  dataSource,
  feedStatus,
  apiLatencyMs,
  lastUpdated,
  signalActivity = 0,
}: OperationalBarProps) {
  const [, setClock] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setClock((c) => c + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const lastUpdateLabel = formatLastUpdate(lastUpdated);
  const isLiveSource = dataSource === "sportmonks";
  const latencyLabel =
    apiLatencyMs !== undefined ? `${apiLatencyMs}ms` : "—";

  return (
    <div className="mb-5 border border-card/80 bg-surface/60">
      <div className="flex items-center justify-between border-b border-card/60 px-3 py-1.5">
        <span className="font-mono text-[8px] font-semibold uppercase tracking-[0.35em] text-muted">
          Control Room Telemetry
        </span>
        <span className="font-mono text-[8px] uppercase tracking-widest text-muted/70">
          SYS/OPS/01
        </span>
      </div>

      <div className="grid grid-cols-2 gap-px bg-card/40 sm:grid-cols-3 lg:grid-cols-5">
        <StripCell
          icon={Database}
          label="Data Source"
          value={`${dataSourceLabel(dataSource)}${feedStatusSuffix(feedStatus)}`}
          accent={isLiveSource}
          warn={!isLiveSource}
        />
        <StripCell
          icon={Radio}
          label="Match Count"
          value={String(trackedCount)}
        />
        <StripCell icon={Wifi} label="API Latency" value={latencyLabel} />
        <StripCell icon={Clock} label="Last Update" value={lastUpdateLabel} />
        <StripCell
          icon={Activity}
          label="Signal Activity"
          value={`${signalActivity}%`}
          sub={`${activeSignals} alerts`}
          className="col-span-2 sm:col-span-1"
        >
          <div className="mt-1.5 h-1 w-full overflow-hidden bg-card">
            <div
              className="h-full bg-gradient-to-r from-orange-500/80 to-pressure transition-all duration-700"
              style={{ width: `${signalActivity}%` }}
            />
          </div>
        </StripCell>
      </div>
    </div>
  );
}

function StripCell({
  icon: Icon,
  label,
  value,
  sub,
  accent = false,
  warn = false,
  className = "",
  children,
}: {
  icon: typeof Radio;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  warn?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const valueClass = warn
    ? "text-amber-400"
    : accent
      ? "text-pressure"
      : "text-foreground";

  return (
    <div className={`flex flex-col bg-surface/80 px-3 py-2.5 ${className}`}>
      <div className="flex items-center gap-1.5">
        <Icon
          className={`h-3 w-3 shrink-0 ${
            warn ? "text-amber-400" : accent ? "text-pressure" : "text-muted"
          }`}
        />
        <span className="telemetry-label">{label}</span>
      </div>
      <p
        className={`mt-1 font-mono text-xs font-bold tabular-nums tracking-wide transition-colors duration-500 ${valueClass}`}
      >
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-muted">
          {sub}
        </p>
      )}
      {children}
    </div>
  );
}
