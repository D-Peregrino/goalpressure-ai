"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/auth/fetchWithAuth";

interface Metrics {
  mrrLabel?: string;
  activeSubscribers?: number;
  trialing?: number;
  canceled?: number;
  upgrades?: number;
  copaLeads?: number;
  copaConversionPct?: number;
  byPlan?: Record<string, number>;
}

export default function SubscriptionMetrics() {
  const [m, setM] = useState<Metrics | null>(null);

  useEffect(() => {
    fetchWithAuth("/api/admin/subscriptions/metrics")
      .then((r) => r.json())
      .then((d: Metrics) => setM(d));
  }, []);

  if (!m) return <p className="gp-admin-muted">Carregando métricas…</p>;

  return (
    <div className="gp-billing-admin-kpis">
      <div className="gp-billing-admin-kpi">
        <span className="gp-admin-muted">MRR</span>
        <strong>{m.mrrLabel ?? "—"}</strong>
      </div>
      <div className="gp-billing-admin-kpi">
        <span className="gp-admin-muted">Ativos</span>
        <strong>{m.activeSubscribers ?? 0}</strong>
      </div>
      <div className="gp-billing-admin-kpi">
        <span className="gp-admin-muted">Trials</span>
        <strong>{m.trialing ?? 0}</strong>
      </div>
      <div className="gp-billing-admin-kpi">
        <span className="gp-admin-muted">Cancelados</span>
        <strong>{m.canceled ?? 0}</strong>
      </div>
      <div className="gp-billing-admin-kpi">
        <span className="gp-admin-muted">Upgrades</span>
        <strong>{m.upgrades ?? 0}</strong>
      </div>
      <div className="gp-billing-admin-kpi">
        <span className="gp-admin-muted">Leads Copa</span>
        <strong>{m.copaLeads ?? 0}</strong>
      </div>
      <div className="gp-billing-admin-kpi">
        <span className="gp-admin-muted">Conversão Copa</span>
        <strong>{m.copaConversionPct ?? 0}%</strong>
      </div>
      <div className="gp-billing-admin-kpi">
        <span className="gp-admin-muted">Por plano</span>
        <strong style={{ fontSize: "0.85rem" }}>
          {Object.entries(m.byPlan ?? {})
            .map(([k, v]) => `${k}: ${v}`)
            .join(" · ") || "—"}
        </strong>
      </div>
    </div>
  );
}
