"use client";

import { useEffect, useRef } from "react";
import { useBehaviorTrack } from "@/hooks/useBehaviorTrack";

/** Registra foco no GPI (UI) sem tocar na GPI engine. */
export default function GpiFocusBeacon({
  fixtureId,
  gpi,
}: {
  fixtureId: string;
  gpi?: number;
}) {
  const { track } = useBehaviorTrack();
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    track("gpi_focus", {
      fixtureId,
      payload: { gpi: gpi ?? null },
    });
  }, [fixtureId, gpi, track]);

  return null;
}
