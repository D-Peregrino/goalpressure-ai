"use client";

import type { OpsMultiViewCount } from "@/lib/ops/opsCenter.types";

const OPTIONS: { count: OpsMultiViewCount; label: string }[] = [
  { count: 1, label: "1" },
  { count: 2, label: "2" },
  { count: 4, label: "4" },
];

export default function MultiViewSelector({
  value,
  onChange,
  broadcastMode,
  onBroadcastToggle,
}: {
  value: OpsMultiViewCount;
  onChange: (v: OpsMultiViewCount) => void;
  broadcastMode: boolean;
  onBroadcastToggle: () => void;
}) {
  return (
    <div className="gp-ops-multiview">
      <span className="gp-ops-multiview__label">Multi-view</span>
      <div className="gp-ops-multiview__tabs" role="tablist">
        {OPTIONS.map((o) => (
          <button
            key={o.count}
            type="button"
            role="tab"
            aria-selected={value === o.count}
            className={value === o.count ? "active" : ""}
            onClick={() => onChange(o.count)}
          >
            {o.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        className={`gp-ops-broadcast-btn ${broadcastMode ? "active" : ""}`}
        onClick={onBroadcastToggle}
      >
        {broadcastMode ? "Sair TV" : "TV / Fullscreen"}
      </button>
    </div>
  );
}
