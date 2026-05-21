import { AlertTriangle } from "lucide-react";
import type { MarketType, SignalConfidence } from "@/types/domain";
import { getMarketLabel } from "@/types/domain";

export interface SignalCardProps {
  market: MarketType;
  match: string;
  odd: number;
  confidence: SignalConfidence;
  reason: string;
  stake: number;
  score: number;
  isLive?: boolean;
}

const CONFIDENCE_STYLES: Record<
  SignalConfidence,
  { text: string; border: string; bg: string }
> = {
  MEDIUM: {
    text: "text-amber-400",
    border: "border-amber-500/35",
    bg: "bg-amber-500/[0.04]",
  },
  HIGH: {
    text: "text-pressure",
    border: "border-pressure/50",
    bg: "bg-pressure/[0.06]",
  },
};

export default function SignalCard({
  market,
  match,
  odd,
  confidence,
  reason,
  stake,
  score,
  isLive = false,
}: SignalCardProps) {
  const style = CONFIDENCE_STYLES[confidence];
  const isHigh = confidence === "HIGH";
  const marketLabel = getMarketLabel(market);

  return (
    <article
      className={`corner-brackets relative overflow-hidden border p-4 transition-all duration-300 scanline-overlay ${style.border} ${style.bg} ${
        isHigh ? "alert-border-high glow-red-strong" : ""
      } ${isLive ? "signal-live-pulse" : ""}`}
    >
      <div className="flex items-start justify-between gap-3 border-b border-card/60 pb-3">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <AlertTriangle
            className={`mt-0.5 h-4 w-4 shrink-0 ${isHigh ? "text-pressure" : "text-amber-400"}`}
            strokeWidth={2}
          />
          <div>
            <p className="font-mono text-[8px] font-semibold uppercase tracking-[0.3em] text-pressure">
              Signal Validated
            </p>
            <p className="mt-1 font-mono text-sm font-bold uppercase tracking-wide text-foreground">
              {marketLabel}
            </p>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">
              {match}
            </p>
          </div>
        </div>
        {isLive && (
          <span className="flex shrink-0 items-center gap-1 border border-pressure/40 bg-pressure/10 px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider text-pressure">
            <span className="h-1 w-1 rounded-full bg-pressure animate-live-blink" />
            Live
          </span>
        )}
      </div>

      <p className="mt-3 border-l-2 border-card pl-3 font-mono text-[10px] leading-relaxed text-muted">
        {reason}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-px bg-card/50 sm:grid-cols-4">
        <Metric label="Odd" value={odd.toFixed(2)} />
        <Metric label="Confidence" value={confidence} accent className={style.text} />
        <Metric label="Stake" value={`${stake}u`} />
        <Metric label="Score" value={String(score)} />
      </div>
    </article>
  );
}

function Metric({
  label,
  value,
  accent = false,
  className = "",
}: {
  label: string;
  value: string;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className="bg-surface/80 px-2.5 py-2">
      <p className="telemetry-label">{label}</p>
      <p
        className={`mt-0.5 font-mono text-sm font-bold tabular-nums uppercase tracking-wide ${
          accent ? className : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export function SignalEmptyState() {
  return (
    <div className="corner-brackets flex flex-col items-center border border-dashed border-card/80 bg-card/20 px-6 py-12 text-center">
      <div className="mb-4 flex h-10 w-10 items-center justify-center border border-card">
        <span className="h-2 w-2 rounded-full bg-muted/40 animate-pulse-glow" />
      </div>
      <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-muted">
        No Validated Signal — Engine Monitoring
      </p>
      <p className="mt-3 max-w-xs font-mono text-[10px] leading-relaxed uppercase tracking-wider text-muted/70">
        Scanning live pressure windows · Over 0.5 · Over 1.5 · Awaiting threshold
        breach
      </p>
    </div>
  );
}
