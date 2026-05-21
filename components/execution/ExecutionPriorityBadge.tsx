"use client";

const STYLES: Record<string, string> = {
  EXECUTE: "gp-exec--execute",
  AGGRESSIVE_EXECUTE: "gp-exec--aggressive",
  WATCH: "gp-exec--watch",
  HOLD: "gp-exec--hold",
  SKIP: "gp-exec--skip",
};

export default function ExecutionPriorityBadge({
  decision,
  grade,
}: {
  decision?: string | null;
  grade?: string | null;
}) {
  const key = (decision ?? "WATCH").toUpperCase().replace(/\s+/g, "_");
  const cls = STYLES[key] ?? STYLES.WATCH;

  return (
    <div className={`gp-exec ${cls}`}>
      <span className="gp-exec__decision">{decision ?? "WATCH"}</span>
      {grade && <span className="gp-exec__grade">Grade {grade}</span>}
    </div>
  );
}
