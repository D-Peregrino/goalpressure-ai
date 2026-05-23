"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import AdminKpiCard from "@/components/admin/AdminKpiCard";
import { adminAreaEnabled } from "@/lib/auth/admin";
import Link from "next/link";
import { formatarPreco } from "@/lib/subscription/plans";
import { fetchWithAuth } from "@/lib/auth/fetchWithAuth";

export default function AdminPage() {
  const [stats, setStats] = useState<{
    leadsTotal?: number;
    leadsNew?: number;
    customersActive?: number;
    trialsActive?: number;
    subscriptionsExpired?: number;
    revenueCents?: number;
    fundadorCount?: number;
    byPlan?: { free?: number; fundador?: number; pro?: number; elite?: number };
  } | null>(null);

  useEffect(() => {
    fetchWithAuth("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats);
  }, []);

  if (!adminAreaEnabled()) {
    return (
      <div className="gp-admin-denied">
        <p>Painel admin não configurado. Defina ADMIN_EMAILS no servidor.</p>
        <Link href="/">Início</Link>
      </div>
    );
  }

  return (
    <AdminShell>
      <h1 className="gp-admin-title">Painel comercial</h1>
      <div className="gp-admin-kpi-grid">
        <AdminKpiCard label="Leads" value={stats?.leadsTotal ?? "—"} sub={`${stats?.leadsNew ?? 0} novos`} />
        <AdminKpiCard label="Clientes ativos" value={stats?.customersActive ?? "—"} />
        <AdminKpiCard label="Trials" value={stats?.trialsActive ?? "—"} />
        <AdminKpiCard label="Vencidas" value={stats?.subscriptionsExpired ?? "—"} />
        <AdminKpiCard label="Fundadores" value={stats?.fundadorCount ?? "—"} />
        <AdminKpiCard
          label="Receita estimada"
          value={stats ? formatarPreco(stats.revenueCents ?? 0) : "—"}
        />
      </div>
      {stats?.byPlan && (
        <p className="gp-admin-sub mt-4">
          Por plano: gratuito {stats.byPlan.free ?? 0} · fundador {stats.byPlan.fundador ?? 0} · pro{" "}
          {stats.byPlan.pro ?? 0} · elite {stats.byPlan.elite ?? 0}
        </p>
      )}
    </AdminShell>
  );
}
