"use client";

import { Clock } from "lucide-react";

export default function TriggerWindowChip({ window }: { window?: string | null }) {
  return (
    <span className="gp-chip gp-chip--window" title="Trigger window">
      <Clock className="h-3 w-3 shrink-0 opacity-70" />
      <span>{window ?? "—"}</span>
    </span>
  );
}
