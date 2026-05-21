"use client";

import type { DisplayMatchStatus } from "@/lib/ui/matchFormatting";

const STYLES: Record<DisplayMatchStatus, string> = {
  LIVE: "bg-[rgba(255,43,43,0.12)] text-[#FF2B2B] border-[rgba(255,43,43,0.28)]",
  HT: "bg-amber-50 text-amber-700 border-amber-200",
  FT: "bg-[var(--gp-white-tech)] text-[var(--muted)] border-[var(--border)]",
  PRE: "bg-[var(--gp-white-tech)] text-[var(--muted)] border-[var(--border)]",
  POST: "bg-[var(--gp-white-tech)] text-[var(--muted)] border-[var(--border)]",
  "—": "bg-[var(--gp-white-tech)] text-[var(--muted)] border-[var(--border)]",
};

export default function MatchStatusPill({
  status,
  minuteLabel,
  pulse,
}: {
  status: DisplayMatchStatus;
  minuteLabel?: string;
  pulse?: boolean;
}) {
  const isLive = status === "LIVE";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono-data text-xs font-semibold ${STYLES[status]} ${pulse && isLive ? "t-live-pulse" : ""}`}
    >
      {isLive && <span className="h-1.5 w-1.5 rounded-full bg-[#FF2B2B]" />}
      {status}
      {minuteLabel && status !== "FT" && status !== "PRE" && (
        <span className="text-[#FF2B2B]">{minuteLabel}</span>
      )}
    </span>
  );
}
