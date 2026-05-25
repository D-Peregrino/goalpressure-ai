import type {
  AutonomousDecisionInput,
  MarketRegime,
  SignalSensitivity,
} from "@/lib/autonomous/autonomous.types";

/**
 * Recomendações de auto-calibração institucional.
 */
export function buildSelfCalibrationRecommendations(
  input: AutonomousDecisionInput,
  regime: MarketRegime,
  sensitivity: SignalSensitivity,
  falsePositiveRisk: number,
  overfittingRisk: number
): string[] {
  const notes: string[] = [];
  const league = input.match.league;
  const fpRate = input.globalFalsePositiveRate ?? 0;

  if (regime === "LATE_GOAL_REGIME" && falsePositiveRisk > 55) {
    notes.push("Reduzir sinais late goal neste ciclo — conversão abaixo do baseline.");
  }
  if (regime === "CALM_MARKET" || regime === "LOW_CONVERSION") {
    notes.push(`Aumentar threshold em ${league || "liga lenta"} — ritmo de conversão reduzido.`);
  }
  if (regime === "CHAOTIC_MARKET" || (input.match.opsIntelligence?.chaosLevel ?? 0) >= 70) {
    notes.push("Reduzir dispatch Telegram em alta volatilidade — priorizar feed operacional.");
  }
  if (sensitivity === "CONSERVATIVE") {
    notes.push("Sistema conservador ativado — aguardar confirmação quantitativa adicional.");
  }
  if (sensitivity === "HYPER_AGGRESSIVE" || sensitivity === "AGGRESSIVE") {
    notes.push("Ambiente agressivo detectado — sensibilidade elevada com monitoramento de risco.");
  }
  if (overfittingRisk >= 55) {
    notes.push("Amostra histórica insuficiente — evitar overfitting em padrões específicos.");
  }
  if (fpRate > 50) {
    notes.push("Taxa de falsos positivos elevada — recalibrar pesos de pressão sugerido.");
  }
  if (notes.length === 0) {
    notes.push("Parâmetros adaptativos estáveis — manter leitura institucional atual.");
  }

  return notes.slice(0, 4);
}
