"use client";

import type { ReactNode } from "react";

export default function SmartTooltip({
  label,
  tip,
  children,
}: {
  label: string;
  tip: string;
  children: ReactNode;
}) {
  return (
    <span className="gp-smart-tip" data-gp-tip={tip} title={tip} aria-label={`${label}: ${tip}`}>
      {children}
    </span>
  );
}
