"use client";

import { memo, useEffect, useState } from "react";
import { getCachedLogoUrl } from "@/lib/teams/teamLogoResolver";
import { resolveFallbackLogo } from "@/lib/teams/teamLogoResolver";

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
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(!resolvedUrl);
  const sizeCls = SIZE_CLASS[size];

  useEffect(() => {
    setFailed(false);
    setLoaded(!resolvedUrl);
  }, [resolvedUrl]);

  const showLogo = Boolean(resolvedUrl) && !failed;
  const showSkeleton = Boolean(resolvedUrl) && !loaded && !failed;

  if (showSkeleton) {
    return (
      <span
        className={`gp-team-crest gp-team-crest--skeleton gp-team-crest--premium ${sizeCls}`}
        title={teamName}
        aria-hidden
      />
    );
  }

  if (showLogo && resolvedUrl) {
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
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      </span>
    );
  }

  return (
    <span
      className={`gp-team-crest gp-team-crest--fallback gp-team-crest--premium ${sizeCls}`}
      style={{ background: fallback.background, color: fallback.color }}
      title={teamName}
    >
      {fallback.initials}
    </span>
  );
}

const TeamBadge = memo(TeamBadgeInner);
export default TeamBadge;
