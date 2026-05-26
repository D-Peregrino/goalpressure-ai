import type { GPIClassification } from "@/lib/gpi/gpi.types";

const LABELS: Record<GPIClassification, string> = {
  neutro: "Neutro",
  monitoramento: "Monitoramento",
  aceleracao: "Aceleração",
  zona_critica: "Zona crítica",
  ruptura_ofensiva_provavel: "Ruptura ofensiva provável",
};

export function classifyGPI(score: number, predictiveBoost: boolean): GPIClassification {
  if (score >= 82 || (predictiveBoost && score >= 76)) {
    return "ruptura_ofensiva_provavel";
  }
  if (score >= 68) return "zona_critica";
  if (score >= 52) return "aceleracao";
  if (score >= 35) return "monitoramento";
  return "neutro";
}

export function getClassificationLabel(c: GPIClassification): string {
  return LABELS[c];
}

export function intensityFromScore(score: number): string {
  if (score >= 85) return "Muito alta";
  if (score >= 70) return "Alta";
  if (score >= 52) return "Média";
  if (score >= 35) return "Baixa";
  return "Neutra";
}
