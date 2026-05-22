"use client";

import type { TrustLevel } from "@/lib/ux/dataTrust";

export default function TrustIndicator({
  level,
  label,
  sources,
  compact = false,
}: {
  level: TrustLevel;
  label: string;
  sources?: string[];
  compact?: boolean;
}) {
  return (
    <span
      className={`gp-trust gp-trust--${level} ${compact ? "gp-trust--compact" : ""}`}
      title={
        sources?.length
          ? `Fontes: ${sources.join(", ")}`
          : undefined
      }
    >
      <span className="gp-trust__dot" aria-hidden />
      <span className="gp-trust__label">{label}</span>
      {!compact && sources && sources.length > 0 && (
        <span className="gp-trust__sources">{sources.join(" · ")}</span>
      )}
    </span>
  );
}
