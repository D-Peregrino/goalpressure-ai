"use client";

import AdminShell from "@/components/admin/AdminShell";
import SubscriptionsTable from "@/components/admin/SubscriptionsTable";
import SubscriptionMetrics from "@/components/admin/SubscriptionMetrics";

export default function AdminAssinaturasPage() {
  return (
    <AdminShell>
      <h1 className="gp-admin-title">Assinaturas</h1>
      <p className="gp-admin-sub">MRR, trials, conversão Copa e assinantes Stripe.</p>
      <SubscriptionMetrics />
      <SubscriptionsTable />
    </AdminShell>
  );
}
