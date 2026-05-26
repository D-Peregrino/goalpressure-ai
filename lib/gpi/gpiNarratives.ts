import type { GPIClassification, GPITrend } from "@/lib/gpi/gpi.types";

export function buildGpiNarrative(params: {
  classification: GPIClassification;
  trend: GPITrend;
  marketLagActive: boolean;
  pressureFalling: boolean;
}): string {
  const { classification, trend, marketLagActive, pressureFalling } = params;

  if (pressureFalling && trend === "caindo") {
    return "Pressão perdeu força operacional — contexto desacelera sem confirmação ofensiva sustentada.";
  }

  if (marketLagActive) {
    return "Mercado ainda abaixo da intensidade real em campo — leitura contextual antecipada.";
  }

  if (classification === "ruptura_ofensiva_provavel") {
    return "Ruptura contextual provável — convergência de pressão, preditivo e leitura operacional.";
  }

  if (classification === "zona_critica") {
    return "Zona crítica operacional — intensidade elevada com risco contextual concentrado.";
  }

  if (classification === "aceleracao") {
    return "Contexto ofensivo acelerando — ritmo e pressão em trajetória ascendente.";
  }

  if (classification === "monitoramento") {
    return "Cenário em monitoramento — sinais moderados aguardando confirmação tática.";
  }

  return "Contexto operacional neutro — sem convergência relevante neste momento.";
}

export function trendLabel(trend: GPITrend): string {
  if (trend === "subindo") return "Tendência ascendente";
  if (trend === "caindo") return "Tendência em queda";
  return "Tendência estável";
}
