"use client";

import { useEffect, useState } from "react";

interface Lead {
  id: string;
  name?: string;
  email: string;
  phone?: string;
  source?: string;
  status?: string;
  coupon_code?: string;
  created_at?: string;
}

const STATUS_OPTIONS = [
  { value: "new", label: "Novo" },
  { value: "contacted", label: "Contatado" },
  { value: "qualified", label: "Qualificado" },
  { value: "trial", label: "Trial" },
  { value: "converted", label: "Convertido" },
  { value: "lost", label: "Perdido" },
];

export default function LeadsTable() {
  const [leads, setLeads] = useState<Lead[]>([]);

  function load() {
    fetch("/api/admin/leads", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setLeads(d.leads ?? []));
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(id: string, status: string) {
    await fetch("/api/admin/leads", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
  }

  function exportCsv() {
    const header = "email,nome,fonte,status,cupom,data\n";
    const rows = leads
      .map(
        (l) =>
          `${l.email},${l.name ?? ""},${l.source ?? ""},${l.status ?? ""},${l.coupon_code ?? ""},${l.created_at ?? ""}`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads-goalpressure.csv";
    a.click();
  }

  return (
    <div>
      <button type="button" className="gp-btn gp-btn--secondary mb-4" onClick={exportCsv}>
        Exportar CSV
      </button>
      <table className="gp-admin-table">
        <thead>
          <tr>
            <th>E-mail</th>
            <th>Nome</th>
            <th>Fonte</th>
            <th>Status</th>
            <th>Cupom</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => (
            <tr key={l.id}>
              <td>{l.email}</td>
              <td>{l.name ?? "—"}</td>
              <td>{l.source ?? "—"}</td>
              <td>
                <select
                  className="gp-admin-filter gp-admin-filter--inline"
                  value={l.status ?? "new"}
                  onChange={(e) => updateStatus(l.id, e.target.value)}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </td>
              <td>{l.coupon_code ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
