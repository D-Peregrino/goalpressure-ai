"use client";

import type { DisplayMatchStatus } from "@/lib/ui/matchFormatting";

const STYLES: Record<DisplayMatchStatus, string> = {
  LIVE: "bg-[rgba(255,43,43,0.1)] text-[#FF2B2B] border-[rgba(255,43,43,0.25)]",
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
  const showMinute =
    minuteLabel &&
    minuteLabel !== "—" &&
    minuteLabel !== "PRE" &&
    status !== "FT";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono-data text-xs font-semibold ${STYLES[status]} ${pulse && isLive ? "t-live-pulse" : ""}`}
    >
      {isLive && <span className="h-1.5 w-1.5 rounded-full bg-[#FF2B2B]" />}
      {status === "PRE" ? "PRE" : isLive && !showMinute ? "AO VIVO" : status}
      {showMinute && <span className="text-[#FF2B2B]">{minuteLabel}</span>}
      {status === "HT" && minuteLabel === "HT" && <span>{minuteLabel}</span>}
    </span>
  );
}
