"use client";

import AdminShell from "@/components/admin/AdminShell";
import PaymentsTable from "@/components/admin/PaymentsTable";

export default function AdminPagamentosPage() {
  return (
    <AdminShell>
      <h1 className="gp-admin-title">Pagamentos</h1>
      <p className="gp-admin-sub">Histórico de cobranças (mock ou gateway real).</p>
      <PaymentsTable />
    </AdminShell>
  );
}
