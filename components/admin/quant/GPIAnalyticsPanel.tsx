"use client";

import type { QuantGpiAnalytics } from "@/lib/admin/quant/quant.types";
import { QuantBarList, QuantMetricGrid, QuantPanelShell } from "./QuantPanelShell";

export default function GPIAnalyticsPanel({ data }: { data: QuantGpiAnalytics }) {
  return (
    <QuantPanelShell
      title="GPI Analytics"
      subtitle="Distribuição e efetividade operacional do GoalPressure Index"
    >
      <QuantMetricGrid
        items={[
          { label: "GPI médio", value: data.avgScore },
          { label: "GPI ≥ 85", value: data.highGpiCount },
          { label: "Falso positivo", value: `${data.falsePositivePct}%` },
          { label: "Efetividade operacional", value: `${data.operationalEffectivenessPct}%` },
          { label: "Timing médio (est.)", value: `${data.avgTimingMinutes} min` },
        ]}
      />
      <div className="gp-quant-cols">
        <div>
          <h3 className="gp-quant-section-label">Distribuição do GPI</h3>
          <QuantBarList
            rows={data.distribution.map((d) => ({
              label: d.label,
              value: d.count,
              pct: d.sharePct,
            }))}
          />
        </div>
        <div>
          <h3 className="gp-quant-section-label">Taxa de ruptura por faixa</h3>
          <QuantBarList
            rows={data.ruptureRateByBand.map((b) => ({
              label: b.band,
              value: b.samples,
              pct: b.ratePct,
            }))}
          />
        </div>
      </div>
      <p className="gp-quant-disclaimer">
        Métricas indicativas sobre amostras históricas e leituras ao vivo — sem garantia de desempenho
        futuro.
      </p>
    </QuantPanelShell>
  );
}
