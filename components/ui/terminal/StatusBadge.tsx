"use client";

const STYLES: Record<string, string> = {
  ONLINE: "t-badge t-badge--ok",
  LIVE: "t-badge t-badge--ok",
  ACTIVE: "t-badge t-badge--ok",
  READY: "t-badge t-badge--ok",
  SANDBOX: "t-badge t-badge--warn",
  DEGRADED: "t-badge t-badge--warn",
  OFFLINE: "t-badge t-badge--off",
  ERROR: "t-badge t-badge--off",
  IDLE: "t-badge",
};

export default function StatusBadge({
  status,
  pulse,
}: {
  status: string;
  pulse?: boolean;
}) {
  const cls = STYLES[status] ?? "t-badge";
  return (
    <span className={`${cls} ${pulse ? "t-live-pulse" : ""}`}>
      {status}
    </span>
  );
}
