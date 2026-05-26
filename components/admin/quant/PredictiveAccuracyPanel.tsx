"use client";

import { QuantMetricGrid, QuantPanelShell } from "./QuantPanelShell";

export default function PredictiveAccuracyPanel({
  predictiveAccuracyPct,
  validAnticipations,
}: {
  predictiveAccuracyPct: number;
  validAnticipations: number;
}) {
  return (
    <QuantPanelShell
      title="Precisão preditiva"
      subtitle="Leituras preditivas e antecipações válidas no ciclo operacional"
    >
      <QuantMetricGrid
        items={[
          { label: "Precisão preditiva", value: `${predictiveAccuracyPct}%` },
          { label: "Antecipações válidas", value: validAnticipations },
          {
            label: "Leitura",
            value: "Indicativa",
            hint: "Baseada em snapshots do motor preditivo",
          },
        ]}
      />
    </QuantPanelShell>
  );
}
