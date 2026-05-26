"use client";

import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import GPIAnalyticsPanel from "@/components/admin/quant/GPIAnalyticsPanel";
import LeagueReliabilityHeatmap from "@/components/admin/quant/LeagueReliabilityHeatmap";
import PatternIntelligencePanel from "@/components/admin/quant/PatternIntelligencePanel";
import OperationalEfficiencyPanel from "@/components/admin/quant/OperationalEfficiencyPanel";
import PredictiveAccuracyPanel from "@/components/admin/quant/PredictiveAccuracyPanel";
import AdaptiveLearningTimeline from "@/components/admin/quant/AdaptiveLearningTimeline";
import FalsePositiveAnalysis from "@/components/admin/quant/FalsePositiveAnalysis";
import { QuantHeatmapGrid } from "@/components/admin/quant/QuantPanelShell";
import { fetchWithAuth } from "@/lib/auth/fetchWithAuth";
import type { QuantOverviewResponse } from "@/lib/admin/quant/quant.types";

export default function QuantIntelligencePage() {
  const [data, setData] = useState<QuantOverviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth("/api/admin/quant/overview");
      const body = await res.json();
      if (!res.ok) {
        setError(typeof body?.error === "string" ? body.error : "Falha ao carregar dados");
        return;
      }
      if (body?.generatedAt) {
        setData(body as QuantOverviewResponse);
      }
    } catch {
      setError("Erro de rede ao carregar dashboard quantitativo");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AdminShell>
      <div className="gp-quant-page">
        <header className="gp-quant-page__hero">
          <div>
            <p className="gp-quant-page__kicker">GoalPressure AI · Intelligence</p>
            <h1 className="gp-admin-title">Quantitative Intelligence Dashboard</h1>
            <p className="gp-admin-sub">
              Análise histórica e operacional consolidada — estilo institucional quantitativo
            </p>
          </div>
          <button type="button" className="gp-quant-refresh" onClick={() => void load()}>
            Atualizar
          </button>
        </header>

        {loading ? (
          <p className="gp-quant-muted gp-quant-loading">Carregando métricas…</p>
        ) : error ? (
          <div className="gp-quant-error" role="alert">
            {error}
          </div>
        ) : data ? (
          <>
            <p className="gp-quant-generated">
              Atualizado · {new Date(data.generatedAt).toLocaleString("pt-BR")}
            </p>

            <div className="gp-quant-grid gp-quant-grid--hero">
              <GPIAnalyticsPanel data={data.gpi} />
              <OperationalEfficiencyPanel data={data.operational} />
            </div>

            <div className="gp-quant-grid">
              <PredictiveAccuracyPanel
                predictiveAccuracyPct={data.predictiveAccuracyPct}
                validAnticipations={data.operational.validMonitorings}
              />
              <FalsePositiveAnalysis
                falsePositivePct={data.falsePositivePct}
                heatmaps={{
                  byMinute: data.heatmaps.byMinute,
                  byIntensity: data.heatmaps.byIntensity,
                }}
              />
            </div>

            <AdaptiveLearningTimeline timeline={data.timeline} />

            <LeagueReliabilityHeatmap leagues={data.topLeagues} />

            <PatternIntelligencePanel
              strong={data.strongPatterns}
              weak={data.weakPatterns}
            />

            <section className="gp-quant-panel">
              <header className="gp-quant-panel__head">
                <h2 className="gp-quant-panel__title">Heatmaps operacionais</h2>
                <p className="gp-quant-panel__sub">Horário · minuto · liga · intensidade</p>
              </header>
              <div className="gp-quant-heatmaps-grid">
                <div>
                  <h3 className="gp-quant-section-label">Por horário</h3>
                  <QuantHeatmapGrid cells={data.heatmaps.byHour} />
                </div>
                <div>
                  <h3 className="gp-quant-section-label">Por minuto</h3>
                  <QuantHeatmapGrid cells={data.heatmaps.byMinute} />
                </div>
                <div>
                  <h3 className="gp-quant-section-label">Por liga</h3>
                  <QuantHeatmapGrid cells={data.heatmaps.byLeague} />
                </div>
                <div>
                  <h3 className="gp-quant-section-label">Por intensidade</h3>
                  <QuantHeatmapGrid cells={data.heatmaps.byIntensity} />
                </div>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </AdminShell>
  );
}
