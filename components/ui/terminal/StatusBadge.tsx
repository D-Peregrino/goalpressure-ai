"use client";

import { STATUS_LABEL } from "@/lib/ux/productCopy";

const VARIANT: Record<string, string> = {
  ONLINE: "gp-sport-badge--live",
  LIVE: "gp-sport-badge--live",
  ACTIVE: "gp-sport-badge--live",
  READY: "gp-sport-badge--live",
  SANDBOX: "gp-sport-badge--sync",
  SYNC: "gp-sport-badge--sync",
  DEGRADED: "gp-sport-badge--warn",
  OFFLINE: "gp-sport-badge--off",
  ERROR: "gp-sport-badge--off",
  IDLE: "gp-sport-badge--off",
};

export default function StatusBadge({
  status,
  pulse,
}: {
  status: string;
  pulse?: boolean;
}) {
  const variant = VARIANT[status] ?? "gp-sport-badge--off";
  const label = STATUS_LABEL[status] ?? status;
  return (
    <span
      className={`gp-sport-badge ${variant} ${pulse ? "t-live-pulse" : ""}`}
    >
      {label}
    </span>
  );
}
