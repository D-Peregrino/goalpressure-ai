import type { DistortionLevel } from "@/lib/engine/ev/ev.types";

function clamp(v: number, min = 0, max = 200): number {
  return Math.min(max, Math.max(min, v));
}

export function classifyDistortion(percent: number): DistortionLevel {
  const p = clamp(percent, 0, 100);
  if (p >= 18) return "EXTREME";
  if (p >= 12) return "HIGH";
  if (p >= 6) return "MEDIUM";
  return "LOW";
}

/**
 * Distorção: mercado oferece odd maior que a justa (valor para o apostador).
 * percent = ((marketOdd / fairOdd) - 1) * 100
 */
export function calculateMarketDistortion(
  marketOdd: number,
  fairOdd: number
): {
  level: DistortionLevel;
  percent: number;
  marketVsFair: number;
  isValue: boolean;
} {
  const market = Math.max(1.01, marketOdd);
  const fair = Math.max(1.01, fairOdd);
  const percent = clamp(((market / fair) - 1) * 100);
  const level = classifyDistortion(percent);
  return {
    level,
    percent: Math.round(percent * 10) / 10,
    marketVsFair: Math.round((market / fair) * 100) / 100,
    isValue: percent >= 5 && market > fair,
  };
}
