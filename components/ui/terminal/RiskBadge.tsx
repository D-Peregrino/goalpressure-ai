"use client";

export default function RiskBadge({ level }: { level: string }) {
  const map: Record<string, string> = {
    SAFE: "t-risk t-risk--safe",
    WARNING: "t-risk t-risk--warn",
    CRITICAL: "t-risk t-risk--crit",
    SATURATED: "t-risk t-risk--sat",
  };
  return <span className={map[level] ?? "t-risk"}>{level}</span>;
}
