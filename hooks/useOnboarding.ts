"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "gp_onboarding_v1";

export function useOnboarding() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      const done = localStorage.getItem(KEY);
      if (!done) setOpen(true);
    } catch {
      /* ignore */
    }
  }, []);

  const complete = useCallback(() => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }, []);

  const skip = complete;

  return {
    open,
    step,
    setStep,
    complete,
    skip,
    setOpen,
  };
}
