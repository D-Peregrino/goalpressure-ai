"use client";

import { cn } from "@/lib/utils";
import type { TacticalFieldContext } from "./fieldContextMapper";

export default function PressureZones({ ctx }: { ctx: TacticalFieldContext }) {
  const zoneClass =
    ctx.mode === "zona_critica"
      ? "gp-live-field__zone--critical"
      : ctx.mode === "pressao_mandante" || ctx.mode === "pressao_visitante"
        ? "gp-live-field__zone--moderate"
        : ctx.mode === "equilibrado"
          ? "gp-live-field__zone--neutral"
          : "gp-live-field__zone--transition";

  const sideClass =
    ctx.mode === "pressao_mandante"
      ? "gp-live-field__zone-pos--home"
      : ctx.mode === "pressao_visitante"
        ? "gp-live-field__zone-pos--away"
        : "gp-live-field__zone-pos--center";

  return (
    <div className="gp-live-field__zones" aria-hidden>
      <div className={cn("gp-live-field__zone", zoneClass, sideClass)} />
      <div className="gp-live-field__territorial-bars">
        <span style={{ width: `${ctx.homeSector}%` }} className="gp-live-field__bar gp-live-field__bar--home" />
        <span style={{ width: `${ctx.centerSector}%` }} className="gp-live-field__bar gp-live-field__bar--center" />
        <span style={{ width: `${ctx.awaySector}%` }} className="gp-live-field__bar gp-live-field__bar--away" />
      </div>
    </div>
  );
}
