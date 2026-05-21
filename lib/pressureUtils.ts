import type { PressureTier } from "@/types/domain";
import { getPressureTier } from "@/lib/pressureScore";

export { getPressureTier };
export type { PressureTier };

export const PRESSURE_STYLES: Record<
  PressureTier,
  {
    scoreText: string;
    badgeBorder: string;
    badgeBg: string;
    iconColor: string;
    barGradient: string;
    barGlow: string;
    liveDot: string;
    cardHover: string;
    radarColor: string;
    radarGlow: string;
    pulseRing: string;
  }
> = {
  low: {
    scoreText: "text-yellow-400",
    badgeBorder: "border-yellow-500/40",
    badgeBg: "bg-yellow-500/10",
    iconColor: "text-yellow-400",
    barGradient: "from-yellow-500 to-yellow-300",
    barGlow: "shadow-[0_0_12px_rgba(234,179,8,0.45)]",
    liveDot: "bg-yellow-400",
    cardHover:
      "hover:border-yellow-500/35 hover:shadow-[0_14px_48px_rgba(234,179,8,0.12)]",
    radarColor: "rgba(234, 179, 8, 0.85)",
    radarGlow: "rgba(234, 179, 8, 0.25)",
    pulseRing: "ring-yellow-500/20",
  },
  medium: {
    scoreText: "text-orange-400",
    badgeBorder: "border-orange-500/40",
    badgeBg: "bg-orange-500/10",
    iconColor: "text-orange-400",
    barGradient: "from-orange-500 to-orange-300",
    barGlow: "shadow-[0_0_12px_rgba(249,115,22,0.45)]",
    liveDot: "bg-orange-400",
    cardHover:
      "hover:border-orange-500/35 hover:shadow-[0_14px_48px_rgba(249,115,22,0.14)]",
    radarColor: "rgba(249, 115, 22, 0.9)",
    radarGlow: "rgba(249, 115, 22, 0.28)",
    pulseRing: "ring-orange-500/25",
  },
  high: {
    scoreText: "text-pressure",
    badgeBorder: "border-pressure/40",
    badgeBg: "bg-pressure/10",
    iconColor: "text-pressure",
    barGradient: "from-pressure to-glow",
    barGlow: "pressure-bar-glow",
    liveDot: "bg-pressure",
    cardHover:
      "hover:border-pressure/45 hover:shadow-[0_14px_48px_rgba(255,43,43,0.22)]",
    radarColor: "rgba(255, 43, 43, 0.95)",
    radarGlow: "rgba(255, 77, 77, 0.35)",
    pulseRing: "ring-pressure/30",
  },
};
