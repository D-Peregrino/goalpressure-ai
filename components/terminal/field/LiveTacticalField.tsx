"use client";

import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import type { MatchContextResult } from "@/components/terminal/intelligence/ContextEngine";
import FieldAnimations from "./FieldAnimations";
import PressureZones from "./PressureZones";
import { mapFieldContext } from "./fieldContextMapper";

export default function LiveTacticalField({
  match,
  context,
}: {
  match: EnrichedLiveMatch;
  context: MatchContextResult;
}) {
  const ctx = mapFieldContext(match, context);

  return (
    <section className="gp-live-field-wrap">
      <div className="gp-live-field-head">
        <h4 className="gp-live-field-title">Campo tático vivo</h4>
        <p className="gp-live-field-sub">Radar territorial em tempo real</p>
      </div>

      <div className="gp-live-field" aria-label="Campo tático vivo">
        <div className="gp-live-field__grass" aria-hidden />
        <div className="gp-live-field__lines" aria-hidden />
        <PressureZones ctx={ctx} />
        <FieldAnimations mode={ctx.mode} intensityScore={ctx.intensityScore} />
        <p className="gp-live-field__mode">
          {ctx.hasIntensity ? ctx.pressureZoneLabel : "Aguardando intensidade ofensiva"}
        </p>
      </div>

      <div className="gp-live-field__indicators">
        <div>
          <span>Domínio territorial</span>
          <strong>{ctx.dominantLabel}</strong>
        </div>
        <div>
          <span>Zona de pressão</span>
          <strong>{ctx.pressureZoneLabel}</strong>
        </div>
        <div>
          <span>Ritmo ofensivo</span>
          <strong>{ctx.rhythmLabel}</strong>
        </div>
      </div>

      <div className="gp-live-field__legend">
        <span><i className="gp-live-field__dot gp-live-field__dot--red" /> pressão extrema</span>
        <span><i className="gp-live-field__dot gp-live-field__dot--orange" /> pressão moderada</span>
        <span><i className="gp-live-field__dot gp-live-field__dot--blue" /> defesa/controle</span>
        <span><i className="gp-live-field__dot gp-live-field__dot--neutral" /> equilíbrio</span>
      </div>

      {ctx.mode === "zona_critica" ? (
        <p className="gp-live-field__critical-note">
          Zona crítica detectada: intensidade ofensiva em elevação.
        </p>
      ) : null}
    </section>
  );
}
