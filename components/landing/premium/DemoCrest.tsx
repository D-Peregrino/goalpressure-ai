"use client";

import { useState } from "react";
import { normalizeLogoUrl, resolveFallbackLogo } from "@/lib/teams/teamLogoResolver";

export default function DemoCrest({
  logoPath,
  teamName,
  size = 28,
}: {
  logoPath: string;
  teamName: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const url = normalizeLogoUrl(logoPath);
  const fallback = resolveFallbackLogo(teamName);

  if (!url || failed) {
    return (
      <span
        className="gpl-crest-fallback"
        style={{
          width: size,
          height: size,
          background: fallback.background,
          color: fallback.color,
          fontSize: size * 0.34,
        }}
        aria-hidden
      >
        {fallback.initials}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      width={size}
      height={size}
      className="gpl-crest-img"
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
