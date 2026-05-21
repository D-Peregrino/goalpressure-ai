"use client";

import TeamBadge from "@/components/matches/TeamBadge";

export default function ScoreBoard({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  compact,
}: {
  homeTeam: string;
  awayTeam: string;
  homeScore: string;
  awayScore: string;
  compact?: boolean;
}) {
  return (
    <div className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 ${compact ? "gap-1" : "gap-3"}`}>
      <div className="flex min-w-0 items-center justify-end gap-2">
        <span className={`truncate text-right font-medium ${compact ? "text-xs" : "text-sm"}`}>
          {homeTeam}
        </span>
        <TeamBadge teamName={homeTeam} size={compact ? "sm" : "md"} />
      </div>
      <div className={`tabular-nums text-center font-display font-bold tracking-tight ${compact ? "text-xl" : "text-3xl"}`}>
        <span>{homeScore}</span>
        <span className="mx-1.5 text-[var(--muted)] font-normal">:</span>
        <span>{awayScore}</span>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <TeamBadge teamName={awayTeam} size={compact ? "sm" : "md"} />
        <span className={`truncate font-medium ${compact ? "text-xs" : "text-sm"}`}>{awayTeam}</span>
      </div>
    </div>
  );
}
