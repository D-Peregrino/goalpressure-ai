"use client";

import ExecutionBadge from "@/components/ui/terminal/ExecutionBadge";
import type { ExecutionDecisionUi } from "@/components/ui/terminal/ExecutionBadge";

export default function EngineBadges({
  executionDecision,
  executionGrade,
  chaosIndex,
  microeventBadges,
  sequenceState,
}: {
  executionDecision?: string | null;
  executionGrade?: string | null;
  chaosIndex?: number;
  microeventBadges?: string[];
  sequenceState?: string | null;
}) {
  const decision = executionDecision as ExecutionDecisionUi | undefined;
  return (
    <div className="flex flex-wrap gap-1.5">
      {decision && <ExecutionBadge decision={decision} size="sm" />}
      {executionGrade && (
        <span className="rounded-md border border-[var(--border)] bg-[var(--gp-white-tech)] px-2 py-0.5 font-mono-data text-[10px] font-semibold text-[var(--text)]">
          Grade {executionGrade}
        </span>
      )}
      {chaosIndex != null && chaosIndex >= 50 && (
        <span className="rounded-md border border-[rgba(255,43,43,0.2)] bg-[rgba(255,43,43,0.06)] px-2 py-0.5 font-mono-data text-[10px] text-[#FF2B2B]">
          Chaos {Math.round(chaosIndex)}
        </span>
      )}
      {microeventBadges?.map((b) => (
        <span
          key={b}
          className="rounded-md border border-[var(--border)] px-2 py-0.5 font-mono-data text-[10px] text-[var(--muted)]"
        >
          {b}
        </span>
      ))}
      {sequenceState && (
        <span className="rounded-md border border-[var(--border)] px-2 py-0.5 font-mono-data text-[10px] text-[var(--muted)]">
          {sequenceState}
        </span>
      )}
    </div>
  );
}
