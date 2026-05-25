"use client";

import { useUserWorkspace } from "@/hooks/useUserWorkspace";

/** Onboarding guiado — sincronizado com workspace do usuário. */
export function useOnboarding() {
  const ws = useUserWorkspace();
  return {
    open: ws.onboardingOpen,
    step: ws.onboardingStep,
    setStep: ws.setOnboardingStep,
    complete: ws.completeOnboarding,
    skip: ws.skipOnboarding,
    setOpen: ws.setOnboardingOpen,
  };
}
