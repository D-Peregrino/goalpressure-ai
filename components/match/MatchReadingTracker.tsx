"use client";

import { useEffect } from "react";
import { useUserWorkspace } from "@/hooks/useUserWorkspace";

export default function MatchReadingTracker({
  fixtureId,
  label,
  narrative,
}: {
  fixtureId: string;
  label: string;
  narrative?: string;
}) {
  const { recordReading, ready } = useUserWorkspace();

  useEffect(() => {
    if (!ready || !fixtureId) return;
    recordReading({ fixtureId, label, narrative });
  }, [ready, fixtureId, label, narrative, recordReading]);

  return null;
}
