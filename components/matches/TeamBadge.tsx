"use client";

import { getTeamColor, getTeamInitials, getTeamTextOnColor } from "@/lib/ui/teamColors";

export default function TeamBadge({
  teamName,
  logoUrl,
  size = "md",
}: {
  teamName: string;
  logoUrl?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const color = getTeamColor(teamName);
  const initials = getTeamInitials(teamName);
  const dim =
    size === "lg" ? "h-12 w-12 text-sm" : size === "sm" ? "h-8 w-8 text-[10px]" : "h-10 w-10 text-xs";

  if (logoUrl) {
    return (
      <span
        className={`inline-flex shrink-0 overflow-hidden rounded-full ring-2 ring-white bg-white ${dim}`}
        title={teamName}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt="" className="h-full w-full object-contain p-0.5" />
      </span>
    );
  }

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
