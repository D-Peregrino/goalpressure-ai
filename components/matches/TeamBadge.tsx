"use client";

import { useState } from "react";
import { getTeamColor, getTeamInitials, getTeamTextOnColor } from "@/lib/ui/teamColors";

const SIZE_CLASS = {
  sm: "gp-team-crest--sm",
  md: "gp-team-crest--md",
  lg: "gp-team-crest--lg",
  xl: "gp-team-crest--xl",
  "2xl": "gp-team-crest--2xl",
} as const;

export default function TeamBadge({
  teamName,
  logoUrl,
  size = "md",
}: {
  teamName: string;
  logoUrl?: string | null;
  size?: keyof typeof SIZE_CLASS;
}) {
  const color = getTeamColor(teamName);
  const initials = getTeamInitials(teamName);
  const [failed, setFailed] = useState(false);
  const sizeCls = SIZE_CLASS[size];
  const showLogo = Boolean(logoUrl) && !failed;

  if (showLogo) {
    return (
      <span
        className={`gp-team-crest gp-team-crest--img gp-team-crest--premium ${sizeCls}`}
        title={teamName}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl!}
          alt=""
          loading="lazy"
          decoding="async"
          className="gp-team-crest__img"
          onError={() => setFailed(true)}
        />
      </span>
    );
  }

  return (
    <span
      className={`gp-team-crest gp-team-crest--fallback gp-team-crest--premium ${sizeCls}`}
      style={{ background: color, color: getTeamTextOnColor(teamName) }}
      title={teamName}
    >
      {initials}
    </span>
  );
}
