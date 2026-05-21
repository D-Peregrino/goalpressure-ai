"use client";

export default function PressureGauge({
  home,
  away,
  total,
}: {
  home: number;
  away: number;
  total: number;
}) {
  const sum = Math.max(1, home + away);
  const homePct = (home / sum) * 100;
  return (
    <div>
      <div className="mb-2 flex justify-between font-mono-data text-[var(--text-muted-on-dark)]">
        <span>Home {Math.round(home)}</span>
        <span className="t-accent font-medium">Total {Math.round(total)}</span>
        <span>Away {Math.round(away)}</span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-white/[0.08]">
        <div className="bg-[#FF2B2B]/70" style={{ width: `${homePct}%` }} />
        <div className="flex-1 bg-[#FF4D4D]/25" />
      </div>
    </div>
  );
}
