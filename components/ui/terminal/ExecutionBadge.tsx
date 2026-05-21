"use client";

export type ExecutionDecisionUi =
  | "EXECUTE"
  | "AGGRESSIVE_EXECUTE"
  | "PREPARE"
  | "WATCH"
  | "IGNORE"
  | string;

const STYLES: Record<string, { bg: string; color: string; border: string }> = {
  AGGRESSIVE_EXECUTE: {
    bg: "rgba(255,43,43,0.18)",
    color: "#FF4D4D",
    border: "rgba(255,43,43,0.35)",
  },
  EXECUTE: {
    bg: "rgba(255,43,43,0.12)",
    color: "#FF2B2B",
    border: "rgba(255,43,43,0.28)",
  },
  PREPARE: {
    bg: "rgba(180,83,9,0.1)",
    color: "#b45309",
    border: "rgba(180,83,9,0.2)",
  },
  WATCH: {
    bg: "rgba(92,107,122,0.12)",
    color: "#5C6B7A",
    border: "rgba(92,107,122,0.2)",
  },
  IGNORE: {
    bg: "rgba(168,180,192,0.12)",
    color: "#A8B4C0",
    border: "rgba(168,180,192,0.2)",
  },
};

export default function ExecutionBadge({
  decision,
  size = "md",
}: {
  decision: ExecutionDecisionUi;
  size?: "sm" | "md" | "lg";
}) {
  const s = STYLES[decision] ?? STYLES.IGNORE;
  const pad =
    size === "lg"
      ? "px-3 py-1.5 text-xs"
      : size === "sm"
        ? "px-2 py-0.5 text-[11px]"
        : "px-2.5 py-1 text-xs";
  return (
    <span
      className={`inline-flex font-display font-semibold uppercase tracking-wide rounded-md ${pad}`}
      style={{
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
      }}
    >
      {decision.replace(/_/g, " ")}
    </span>
  );
}
