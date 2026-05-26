import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import type { MatchContextResult } from "@/components/terminal/intelligence/ContextEngine";

export type TacticalMode =
  | "equilibrado"
  | "pressao_mandante"
  | "pressao_visitante"
  | "transicao_rapida"
  | "zona_critica";

export interface TacticalFieldContext {
  mode: TacticalMode;
  dominantLabel: string;
  pressureZoneLabel: string;
  rhythmLabel: string;
  territorialLabel: string;
  hasIntensity: boolean;
  intensityScore: number;
  homeSector: number;
  centerSector: number;
  awaySector: number;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function mapFieldContext(
  match: EnrichedLiveMatch,
  context: MatchContextResult
): TacticalFieldContext {
  const pressure = clamp(match.pressureScore);
  const acceleration = clamp(match.engineAccelerationScore ?? 0);
  const territorial = clamp(match.engineTerritorialScore ?? 0);
  const dangerous = clamp(Math.min(100, (match.dangerousAttacks / 50) * 100));
  const intensity = clamp(
    pressure * 0.45 + acceleration * 0.2 + dangerous * 0.2 + context.score * 0.15
  );
  const balanceGap = clamp(Math.abs(match.homePressure - match.awayPressure));

  let mode: TacticalMode = "equilibrado";
  if (context.level === "zona_critica" || context.level === "oportunidade_ev") {
    mode = "zona_critica";
  } else if (acceleration >= 60 || context.badges.includes("TRANSIÇÃO RÁPIDA")) {
    mode = "transicao_rapida";
  } else if (match.homePressure > match.awayPressure + 6) {
    mode = "pressao_mandante";
  } else if (match.awayPressure > match.homePressure + 6) {
    mode = "pressao_visitante";
  }

  const dominantLabel =
    mode === "pressao_mandante"
      ? `${match.homeTeam} domina o campo ofensivo`
      : mode === "pressao_visitante"
        ? `${match.awayTeam} domina o campo ofensivo`
        : mode === "zona_critica"
          ? "Domínio territorial em zona crítica"
          : "Domínio territorial equilibrado";

  const pressureZoneLabel =
    mode === "zona_critica"
      ? "Zona de pressão extrema"
      : mode === "pressao_mandante" || mode === "pressao_visitante"
        ? "Zona de pressão moderada"
        : "Zona de pressão equilibrada";

  const rhythmLabel =
    mode === "transicao_rapida"
      ? "Ritmo ofensivo acelerado"
      : context.level === "desaceleracao"
        ? "Ritmo ofensivo desacelerado"
        : "Ritmo ofensivo estável";

  const hasIntensity = match.isLive && (pressure >= 18 || dangerous >= 12 || acceleration >= 18);
  const homeSector = clamp((match.homePressure / Math.max(1, pressure)) * 100);
  const awaySector = clamp((match.awayPressure / Math.max(1, pressure)) * 100);
  const centerSector = clamp(100 - Math.min(100, Math.abs(homeSector - awaySector)));

  return {
    mode,
    dominantLabel,
    pressureZoneLabel,
    rhythmLabel,
    territorialLabel: `${territorial}% de domínio territorial`,
    hasIntensity,
    intensityScore: clamp(intensity + balanceGap * 0.1),
    homeSector,
    centerSector,
    awaySector,
  };
}
