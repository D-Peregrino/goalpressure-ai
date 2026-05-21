"use client";

import type { ExecutionGrade } from "@/lib/design/tokens";
import { executionGradeStyles } from "@/lib/design/tokens";

export default function ExecutionBadge({
  grade,
  size = "md",
}: {
  grade: ExecutionGrade | string;
  size?: "sm" | "md" | "lg";
}) {
  const key = (grade in executionGradeStyles ? grade : "UNGRADED") as ExecutionGrade;
  const s = executionGradeStyles[key];
  const sizeClass =
    size === "lg"
      ? "px-3 py-1.5 text-sm"
      : size === "sm"
        ? "px-1.5 py-0.5 text-[9px]"
        : "px-2 py-1 text-[10px]";

  return (
    <span
      className={`inline-flex items-center font-mono font-bold uppercase tracking-wider rounded-md border border-white/5 ${sizeClass}`}
      style={{
        background: s.bg,
        color: s.text,
        boxShadow: s.glow,
      }}
    >
      {s.label}
    </span>
  );
}
