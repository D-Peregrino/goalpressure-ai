import type { MatchTemperature, OpsEngineInput } from "@/lib/engine/ops/ops.types";
import { detectChaosLevel } from "@/lib/engine/ops/detectChaosLevel";

function clamp(v: number): number {
  return Math.min(100, Math.max(0, Math.round(v)));
}

export function classifyMatchTemperature(input: OpsEngineInput): MatchTemperature {
  const p = input.pressure?.pressureScore ?? input.match.pressure.score;
  const a = input.pressure?.accelerationScore ?? 0;
  const mom = input.pressure?.momentumScore ?? 0;
  const ev = input.ev?.expectedValue.best?.evPercent ?? 0;
  const { level: chaos } = detectChaosLevel(input);
  const minute = input.match.minute;

  const heat = clamp(
    p * 0.35 + a * 0.2 + mom * 0.2 + chaos * 0.15 + Math.max(0, ev) * 1.2 + (minute >= 70 ? 8 : 0)
  );

  if (heat >= 82) return "IGNITE";
  if (heat >= 62) return "HOT";
  if (heat >= 38) return "WARM";
  return "COLD";
}

export function temperatureToMoment(
  t: MatchTemperature
): "calm" | "warm" | "hot" | "ignite" {
  if (t === "IGNITE") return "ignite";
  if (t === "HOT") return "hot";
  if (t === "WARM") return "warm";
  return "calm";
}

export function temperatureGlowClass(t: MatchTemperature): string {
  switch (t) {
    case "IGNITE":
      return "gp-ops-temp--ignite";
    case "HOT":
      return "gp-ops-temp--hot";
    case "WARM":
      return "gp-ops-temp--warm";
    default:
      return "gp-ops-temp--cold";
  }
}
