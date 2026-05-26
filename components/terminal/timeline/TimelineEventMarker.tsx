"use client";

import type { TimelineEventPoint } from "./timelineMapper";

function markerClass(kind: TimelineEventPoint["kind"]): string {
  switch (kind) {
    case "zona_critica":
      return "gp-smart-timeline__marker--critical";
    case "oportunidade_valor":
    case "mercado_atrasado":
      return "gp-smart-timeline__marker--value";
    case "desaceleracao":
      return "gp-smart-timeline__marker--slow";
    case "transicao_rapida":
      return "gp-smart-timeline__marker--fast";
    default:
      return "gp-smart-timeline__marker--default";
  }
}

export default function TimelineEventMarker({
  event,
  leftPercent,
}: {
  event: TimelineEventPoint;
  leftPercent: number;
}) {
  return (
    <button
      type="button"
      className={`gp-smart-timeline__marker ${markerClass(event.kind)}`}
      style={{ left: `${leftPercent}%` }}
      title={event.detail}
      aria-label={event.detail}
    >
      <span>{event.minute}'</span>
    </button>
  );
}
