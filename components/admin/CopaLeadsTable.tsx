"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/auth/fetchWithAuth";
import type { CopaLeadRow } from "@/lib/copa/copaLeadsDb";

export default function CopaLeadsTable() {
  const [leads, setLeads] = useState<CopaLeadRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithAuth("/api/admin/copa/leads")
      .then((r) => r.json())
      .then((d: { leads?: CopaLeadRow[] }) => setLeads(d.leads ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="gp-admin-muted">Carregando leads da Copa…</p>;
  }

  if (leads.length === 0) {
    return <p className="gp-admin-muted">Nenhum lead da Copa registrado.</p>;
  }

  return (
    <div className="gp-admin-table-wrap">
      <table className="gp-admin-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>E-mail</th>
            <th>Telegram</th>
            <th>Origem</th>
            <th>Data</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => (
            <tr key={l.id}>
              <td>{l.name ?? "—"}</td>
              <td>{l.email}</td>
              <td>{l.telegram ?? "—"}</td>
              <td>{l.source}</td>
              <td>{new Date(l.created_at).toLocaleString("pt-BR")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
