"use client";

import { cn } from "@/lib/utils";
import type { TacticalMode } from "./fieldContextMapper";

export function fieldPulseClass(mode: TacticalMode, intensityScore: number): string {
  if (mode === "zona_critica" || intensityScore >= 78) return "gp-live-field--pulse-critical";
  if (mode === "transicao_rapida" || intensityScore >= 58) return "gp-live-field--pulse-active";
  return "gp-live-field--pulse-soft";
}

export function fieldFlowClass(mode: TacticalMode): string {
  if (mode === "pressao_mandante") return "gp-live-field__flow--home";
  if (mode === "pressao_visitante") return "gp-live-field__flow--away";
  if (mode === "transicao_rapida") return "gp-live-field__flow--transition";
  return "gp-live-field__flow--balanced";
}

export default function FieldAnimations({
  mode,
  intensityScore,
}: {
  mode: TacticalMode;
  intensityScore: number;
}) {
  return (
    <>
      <div className={cn("gp-live-field__pulse", fieldPulseClass(mode, intensityScore))} aria-hidden />
      <div className={cn("gp-live-field__flow", fieldFlowClass(mode))} aria-hidden />
    </>
  );
}
