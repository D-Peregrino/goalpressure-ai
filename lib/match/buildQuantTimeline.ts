/**
 * Timeline quantitativa — eventos derivados de feed + ops (sem novo engine).
 */

import type { TimelineEventSummary } from "@/types/domain";
import { humanizeTimelineEvent } from "@/lib/match/matchStorytelling";

export type QuantTimelineKind =
  | "goal"
  | "card"
  | "corner"
  | "steam"
  | "pressure"
  | "chaos"
  | "odds"
  | "execute"
  | "micro"
  | "sequence"
  | "other";

export interface QuantTimelineEvent {
  id: string;
  minute: number;
  kind: QuantTimelineKind;
  label: string;
  detail?: string;
  side?: "home" | "away";
  intensity?: number;
}

function mapPremiumType(type: string): QuantTimelineKind {
  const t = type.toLowerCase();
  if (t.includes("goal")) return "goal";
  if (t.includes("card") || t.includes("yellow") || t.includes("red")) return "card";
  if (t.includes("corner")) return "corner";
  return "other";
}

export interface BuildQuantTimelineInput {
  minute: number;
  premiumEvents?: TimelineEventSummary[];
  pressureScore: number;
  chaosIndex: number;
  steamMove: boolean;
  oddsDrift: number | null;
  operationalState: string;
  sequenceState?: string | null;
  triggerWindow?: string | null;
  microeventScore?: number | null;
  topEdgeMarket?: string | null;
  topEdgePercent?: number | null;
}

export function buildQuantTimeline(input: BuildQuantTimelineInput): QuantTimelineEvent[] {
  const events: QuantTimelineEvent[] = [];
  const m = Math.max(0, Math.min(120, input.minute));

  for (const ev of input.premiumEvents ?? []) {
    events.push({
      id: `prem-${ev.minute}-${ev.type}`,
      minute: ev.minute,
      kind: mapPremiumType(ev.type),
      label: humanizeTimelineEvent(ev.type, ev.side),
      side: ev.side,
      intensity: 70,
    });
  }

  if (input.steamMove) {
    events.push({
      id: `steam-${m}`,
      minute: m,
      kind: "steam",
      label: "Mercado acelerando",
      detail: input.oddsDrift != null ? `Drift ${input.oddsDrift.toFixed(2)}` : undefined,
      intensity: 85,
    });
  }

  if (input.pressureScore >= 72) {
    events.push({
      id: `pressure-${m}`,
      minute: m,
      kind: "pressure",
      label: "Pressão subindo",
      detail: `Intensidade ${Math.round(input.pressureScore)}`,
      intensity: input.pressureScore,
    });
  }

  if (input.chaosIndex >= 62) {
    events.push({
      id: `chaos-${m}`,
      minute: m,
      kind: "chaos",
      label: "Jogo acelerando",
      detail: `${Math.round(input.chaosIndex)}`,
      intensity: input.chaosIndex,
    });
  }

  if (input.operationalState === "EXECUTE") {
    events.push({
      id: `exec-${m}`,
      minute: m,
      kind: "execute",
      label: "Oportunidade",
      detail: input.topEdgeMarket ?? undefined,
      intensity: 90,
    });
  }

  if (input.oddsDrift != null && Math.abs(input.oddsDrift) >= 0.03 && !input.steamMove) {
    events.push({
      id: `odds-${m}`,
      minute: m,
      kind: "odds",
      label: "Odds em movimento",
      detail: `${input.oddsDrift > 0 ? "+" : ""}${input.oddsDrift.toFixed(2)}`,
      intensity: 55,
    });
  }

  if (input.triggerWindow) {
    events.push({
      id: `micro-${m}`,
      minute: m,
      kind: "micro",
      label: "Momento quente",
      detail: input.triggerWindow,
      intensity: input.microeventScore ?? 60,
    });
  }

  if (input.sequenceState && input.sequenceState !== "STABLE") {
    events.push({
      id: `seq-${m}`,
      minute: m,
      kind: "sequence",
      label: "Mudança de ritmo",
      detail: input.sequenceState,
      intensity: 65,
    });
  }

  if (input.topEdgePercent != null && input.topEdgePercent >= 8) {
    events.push({
      id: `edge-${m}`,
      minute: m,
      kind: "odds",
      label: "Boa vantagem",
      detail: `${input.topEdgeMarket ?? "Market"} +${input.topEdgePercent.toFixed(1)}%`,
      intensity: input.topEdgePercent * 4,
    });
  }

  const byMinute = new Map<number, QuantTimelineEvent>();
  for (const e of events) {
    const key = e.minute * 100 + e.kind.charCodeAt(0);
    byMinute.set(key, e);
  }

  return [...byMinute.values()].sort((a, b) => a.minute - b.minute || b.intensity! - a.intensity!);
}
