"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { clampMinute, nextMinute, type ReplaySpeed } from "@/lib/replay/replayControls";
import type { ReplayDataset, ReplayFrame } from "@/lib/replay/replayEngine";

export function useReplayState(dataset: ReplayDataset | null) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<ReplaySpeed>(1);
  const [minute, setMinute] = useState<number>(0);

  useEffect(() => {
    if (!dataset) return;
    setMinute(dataset.minMinute);
    setIsPlaying(false);
  }, [dataset?.fixtureId, dataset?.minMinute]);

  useEffect(() => {
    if (!dataset || !isPlaying) return;
    const interval = Math.max(90, Math.round(1000 / speed));
    const id = window.setInterval(() => {
      setMinute((m) => {
        const n = nextMinute(m, speed, { min: dataset.minMinute, max: dataset.maxMinute });
        if (n >= dataset.maxMinute) setIsPlaying(false);
        return n;
      });
    }, interval);
    return () => window.clearInterval(id);
  }, [dataset, isPlaying, speed]);

  const setMinuteSafe = useCallback(
    (value: number) => {
      if (!dataset) return;
      setMinute(clampMinute(value, dataset.minMinute, dataset.maxMinute));
    },
    [dataset]
  );

  const frame: ReplayFrame | null = useMemo(() => {
    if (!dataset) return null;
    return dataset.frames.find((f) => f.minute === minute) ?? null;
  }, [dataset, minute]);

  return {
    isPlaying,
    setIsPlaying,
    speed,
    setSpeed,
    minute,
    setMinute: setMinuteSafe,
    frame,
  };
}
