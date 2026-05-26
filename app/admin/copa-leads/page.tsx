"use client";

import AdminShell from "@/components/admin/AdminShell";
import CopaLeadsTable from "@/components/admin/CopaLeadsTable";

export default function AdminCopaLeadsPage() {
  return (
    <AdminShell>
      <h1 className="gp-admin-title">Leads Copa 2026</h1>
      <p className="gp-admin-muted" style={{ marginBottom: "1rem" }}>
        Capturas da área /copa e /copa/alertas — alertas Telegram.
      </p>
      <CopaLeadsTable />
    </AdminShell>
  );
}
