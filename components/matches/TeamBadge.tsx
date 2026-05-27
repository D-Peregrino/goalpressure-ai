"use client";

import { memo, useEffect, useState } from "react";
import { getCachedLogoUrl, resolveFallbackLogo } from "@/lib/teams/teamLogoResolver";

const SIZE_CLASS = {
  sm: "gp-team-crest--sm",
  md: "gp-team-crest--md",
  lg: "gp-team-crest--lg",
  xl: "gp-team-crest--xl",
  "2xl": "gp-team-crest--2xl",
} as const;

function TeamBadgeInner({
  teamName,
  logoUrl,
  size = "md",
}: {
  teamName: string;
  logoUrl?: string | null;
  size?: keyof typeof SIZE_CLASS;
}) {
  const fallback = resolveFallbackLogo(teamName);
  const resolvedUrl = logoUrl ? getCachedLogoUrl(teamName, logoUrl) : null;
  const [showImage, setShowImage] = useState(Boolean(resolvedUrl));
  const sizeCls = SIZE_CLASS[size];

  useEffect(() => {
    setShowImage(Boolean(resolvedUrl));
  }, [resolvedUrl]);

  if (!resolvedUrl || !showImage) {
    return (
      <span
        className={`gp-team-crest gp-team-crest--fallback gp-team-crest--premium ${sizeCls}`}
        style={{ background: fallback.background, color: fallback.color }}
        title={teamName}
        aria-label={teamName}
      >
        {fallback.initials}
      </span>
    );
  }

  return (
    <span
      className={`gp-team-crest gp-team-crest--img gp-team-crest--premium ${sizeCls}`}
      title={teamName}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolvedUrl}
        alt=""
        loading="lazy"
        decoding="async"
        className="gp-team-crest__img"
        style={{ objectFit: "contain" }}
        onError={() => setShowImage(false)}
      />
    </span>
  );
}

const TeamBadge = memo(TeamBadgeInner);
export default TeamBadge;
