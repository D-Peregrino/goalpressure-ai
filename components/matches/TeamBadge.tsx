"use client";

import { getTeamColor, getTeamInitials, getTeamTextOnColor } from "@/lib/ui/teamColors";

export default function TeamBadge({
  teamName,
  size = "md",
}: {
  teamName: string;
  size?: "sm" | "md" | "lg";
}) {
  const color = getTeamColor(teamName);
  const initials = getTeamInitials(teamName);
  const dim =
    size === "lg" ? "h-11 w-11 text-sm" : size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ring-2 ring-white/90 ${dim}`}
      style={{ background: color, color: getTeamTextOnColor(teamName) }}
      title={teamName}
    >
      {initials}
    </span>
  );
}
