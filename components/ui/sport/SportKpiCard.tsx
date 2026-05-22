"use client";

import type { ReactNode } from "react";

export default function SportKpiCard({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div
      className={`gp-sport-kpi ${accent ? "gp-sport-kpi--accent" : ""}`}
    >
      <div className="gp-sport-kpi__head">
        <p className="gp-sport-kpi__label">{label}</p>
        {icon && <span className="gp-sport-kpi__icon">{icon}</span>}
      </div>
      <p className="gp-sport-kpi__value tabular-nums">{value}</p>
      {sub && <p className="gp-sport-kpi__sub">{sub}</p>}
    </div>
  );
}
