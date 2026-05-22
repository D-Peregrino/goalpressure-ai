"use client";

import AdminShell from "@/components/admin/AdminShell";
import LeadsTable from "@/components/admin/LeadsTable";

export default function AdminLeadsPage() {
  return (
    <AdminShell>
      <h1 className="gp-admin-title">Leads</h1>
      <LeadsTable />
    </AdminShell>
  );
}
