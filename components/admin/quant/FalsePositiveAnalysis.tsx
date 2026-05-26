"use client";

import { QuantMetricGrid, QuantPanelShell } from "./QuantPanelShell";

export default function FalsePositiveAnalysis({
  falsePositivePct,
  heatmaps,
}: {
  falsePositivePct: number;
  heatmaps: {
    byMinute: { label: string; value: number; intensity: number }[];
    byIntensity: { label: string; value: number; intensity: number }[];
  };
}) {
  const topMinute = [...heatmaps.byMinute].sort((a, b) => b.value - a.value)[0];
  const topIntensity = [...heatmaps.byIntensity].sort((a, b) => b.value - a.value)[0];

  return (
    <QuantPanelShell
      title="Análise de falso positivo"
      subtitle="Concentração por minuto e intensidade — leitura quantitativa"
    >
      <QuantMetricGrid
        items={[
          { label: "Taxa de falso positivo", value: `${falsePositivePct}%` },
          {
            label: "Faixa de minuto (volume)",
            value: topMinute?.label ?? "—",
            hint: topMinute ? `${topMinute.value} amostras` : undefined,
          },
          {
            label: "Intensidade dominante",
            value: topIntensity?.label ?? "—",
            hint: topIntensity ? `${topIntensity.value} ocorrências` : undefined,
          },
        ]}
      />
      <p className="gp-quant-disclaimer">
        Análise estatística sobre histórico resolvido — não implica recomendação de aposta.
      </p>
    </QuantPanelShell>
  );
}
