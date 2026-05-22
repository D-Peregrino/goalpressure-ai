"use client";

import AdminShell from "@/components/admin/AdminShell";
import CustomersTable from "@/components/admin/CustomersTable";

export default function AdminSuportePage() {
  return (
    <AdminShell>
      <h1 className="gp-admin-title">Suporte</h1>
      <p className="gp-admin-sub">
        Abra um cliente para registrar notas internas e ver o histórico de eventos.
      </p>
      <CustomersTable />
    </AdminShell>
  );
}
