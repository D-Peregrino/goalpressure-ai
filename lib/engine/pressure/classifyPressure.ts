import type { PressureClassification } from "@/lib/engine/pressure/pressure.types";

export type { PressureClassification } from "@/lib/engine/pressure/pressure.types";

function clamp(score: number): number {
  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Classificação final do score ofensivo.
 * 0–39 LOW · 40–59 MEDIUM · 60–74 HIGH · 75–89 VERY_HIGH · 90–100 EXTREME
 */
export function classifyPressure(score: number): PressureClassification {
  const s = clamp(score);
  if (s >= 90) return "EXTREME";
  if (s >= 75) return "VERY_HIGH";
  if (s >= 60) return "HIGH";
  if (s >= 40) return "MEDIUM";
  return "LOW";
}

export function classificationToTier(
  classification: PressureClassification
): "low" | "medium" | "high" {
  if (classification === "EXTREME" || classification === "VERY_HIGH") return "high";
  if (classification === "HIGH" || classification === "MEDIUM") return "medium";
  return "low";
}

export function classificationGlowClass(
  classification: PressureClassification
): string {
  switch (classification) {
    case "EXTREME":
      return "gp-pressure-glow--extreme";
    case "VERY_HIGH":
      return "gp-pressure-glow--very-high";
    case "HIGH":
      return "gp-pressure-glow--high";
    case "MEDIUM":
      return "gp-pressure-glow--medium";
    default:
      return "gp-pressure-glow--low";
  }
}
