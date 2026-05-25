import type {
  AutonomousAlert,
  AutonomousDecisionInput,
  MarketRegime,
  SignalSensitivity,
} from "@/lib/autonomous/autonomous.types";
import { regimeLabel } from "@/lib/autonomous/detectMarketRegime";
import { sensitivityLabel } from "@/lib/autonomous/calculateSignalSensitivity";

const lastRegimeByFixture = new Map<string, MarketRegime>();

export function buildAutonomousAlerts(
  input: AutonomousDecisionInput,
  regime: MarketRegime,
  sensitivity: SignalSensitivity,
  falsePositiveRisk: number,
  fixtureId: string
): AutonomousAlert[] {
  const alerts: AutonomousAlert[] = [];
  const prev = lastRegimeByFixture.get(fixtureId);
  const regimeChanged = prev != null && prev !== regime;
  lastRegimeByFixture.set(fixtureId, regime);

  if (regimeChanged) {
    alerts.push({
      type: "REGIME_CHANGED",
      headline: "Regime operacional alterado",
      narrative: `Transição de ${regimeLabel(prev!)} para ${regimeLabel(regime)} em ${input.match.homeTeam} x ${input.match.awayTeam}.`,
      fixtureId,
    });
  }

  const edge = input.match.learningContext?.historicalEdge.score ?? 50;
  const evPct = input.match.evEngine?.expectedValue.best?.evPercent ?? 0;
  if (edge < 40 && evPct < 2) {
    alerts.push({
      type: "EDGE_DROPPED",
      headline: "Edge histórico em queda",
      narrative: "Convergência quantitativa enfraquecida — validar liquidez e contexto de mercado.",
      fixtureId,
    });
  }

  if ((input.match.opsIntelligence?.chaosLevel ?? 0) >= 68) {
    alerts.push({
      type: "VOLATILITY_UP",
      headline: "Volatilidade ofensiva elevada",
      narrative: "Ritmo imprevisível — sistema prioriza leitura defensiva operacional.",
      fixtureId,
    });
  }

  if (sensitivity === "CONSERVATIVE") {
    alerts.push({
      type: "CONSERVATIVE_MODE",
      headline: "Modo conservador ativo",
      narrative: `Risco de falso positivo ${falsePositiveRisk}% — thresholds elevados automaticamente.`,
      fixtureId,
    });
  }

  if (sensitivity === "AGGRESSIVE" || sensitivity === "HYPER_AGGRESSIVE") {
    alerts.push({
      type: "AGGRESSIVE_ENV",
      headline: "Ambiente agressivo detectado",
      narrative: `Sensibilidade ${sensitivityLabel(sensitivity)} — dispatch com priorização quantitativa.`,
      fixtureId,
    });
  }

  return alerts;
}
