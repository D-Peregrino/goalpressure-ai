"use client";

import { useEffect, useState } from "react";

export function useSystemMetrics() {
  const [latencyMs, setLatencyMs] = useState(42);
  const [signalActivity, setSignalActivity] = useState(78);

  useEffect(() => {
    const interval = setInterval(() => {
      setLatencyMs(36 + Math.floor(Math.random() * 18));
      setSignalActivity(65 + Math.floor(Math.random() * 30));
    }, 2400);

    return () => clearInterval(interval);
  }, []);

  return { latencyMs, signalActivity };
}
