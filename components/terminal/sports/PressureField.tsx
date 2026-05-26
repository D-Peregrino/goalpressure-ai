"use client";

import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import { pressureFieldLabel, pressureZoneSide } from "@/lib/terminal/sportsDisplay";

export default function PressureField({ match }: { match: EnrichedLiveMatch }) {
  const side = pressureZoneSide(match);
  const label = pressureFieldLabel(match);
  const showZone = match.isLive && match.pressureScore >= 15;

  return (
    <div className="gp-pressure-field" aria-label="Campo de pressão">
      <div className="gp-pressure-field__lines" aria-hidden />
      {showZone && (
        <div
          className={`gp-pressure-field__zone gp-pressure-field__zone--${side}`}
          aria-hidden
        />
      )}
      <p className="gp-pressure-field__label">{label}</p>
    </div>
  );
}
