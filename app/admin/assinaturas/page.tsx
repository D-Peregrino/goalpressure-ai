"use client";

import AdminShell from "@/components/admin/AdminShell";
import SubscriptionsTable from "@/components/admin/SubscriptionsTable";

export default function AdminAssinaturasPage() {
  return (
    <AdminShell>
      <h1 className="gp-admin-title">Assinaturas</h1>
      <p className="gp-admin-sub">Planos ativos, trials e renovações.</p>
      <SubscriptionsTable />
    </AdminShell>
  );
}
