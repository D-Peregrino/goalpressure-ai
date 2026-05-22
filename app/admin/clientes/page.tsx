"use client";

import AdminShell from "@/components/admin/AdminShell";
import CustomersTable from "@/components/admin/CustomersTable";

export default function AdminClientesPage() {
  return (
    <AdminShell>
      <h1 className="gp-admin-title">Clientes</h1>
      <p className="gp-admin-sub">Gestão de contas, planos e notas internas.</p>
      <CustomersTable />
    </AdminShell>
  );
}
