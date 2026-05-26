"use client";

import { useEffect, useRef } from "react";
import { useBehaviorTrack } from "@/hooks/useBehaviorTrack";

/** Registra abertura do terminal — sem alterar pipeline de engines. */
export default function TerminalBehaviorTracker() {
  const { track } = useBehaviorTrack();
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    track("terminal_open", { payload: { surface: "sports_terminal" } });
  }, [track]);

  return null;
}
