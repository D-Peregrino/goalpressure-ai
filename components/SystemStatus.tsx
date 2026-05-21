import { Bot, Cpu, Database } from "lucide-react";
import type { ServiceState, ServiceStatus } from "@/types/domain";

export interface SystemStatusProps {
  services: ServiceStatus[];
  latencyMs?: number;
}

const STATE_STYLES: Record<
  ServiceState,
  { label: string; color: string; dot: string }
> = {
  ONLINE: {
    label: "ONLINE",
    color: "text-foreground",
    dot: "bg-pressure",
  },
  ACTIVE: {
    label: "ACTIVE",
    color: "text-foreground",
    dot: "bg-pressure",
  },
  STANDBY: {
    label: "STANDBY",
    color: "text-amber-400",
    dot: "bg-amber-400",
  },
  OFFLINE: {
    label: "OFFLINE",
    color: "text-muted",
    dot: "bg-muted",
  },
};

const SERVICE_ICONS: Record<string, typeof Database> = {
  "Sportmonks API": Database,
  "Signal Engine": Cpu,
  "Telegram Bot": Bot,
};

export default function SystemStatus({
  services,
  latencyMs,
}: SystemStatusProps) {
  return (
    <section className="module-panel corner-brackets p-4 sm:p-5">
      <div className="flex items-center justify-between border-b border-card/60 pb-3">
        <h3 className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-foreground">
          Infrastructure
        </h3>
        <div className="text-right">
          <p className="telemetry-label">Node Status</p>
          {latencyMs !== undefined && (
            <p className="font-mono text-[10px] tabular-nums text-muted">
              Ping {latencyMs}ms
            </p>
          )}
        </div>
      </div>

      <ul className="mt-3 flex flex-col gap-px bg-card/40">
        {services.map((service) => {
          const style = STATE_STYLES[service.state];
          const Icon = SERVICE_ICONS[service.name] ?? Cpu;

          return (
            <li
              key={service.name}
              className="flex items-center justify-between bg-surface/90 px-3 py-2.5"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center border border-card bg-card/50">
                  <Icon className="h-3.5 w-3.5 text-muted" strokeWidth={2} />
                </div>
                <span className="font-mono text-[11px] uppercase tracking-wide text-foreground">
                  {service.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${style.dot} ${
                    service.state !== "OFFLINE" ? "animate-pulse-glow" : ""
                  }`}
                />
                <span
                  className={`font-mono text-[10px] font-bold uppercase tracking-wider ${style.color}`}
                >
                  {style.label}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
