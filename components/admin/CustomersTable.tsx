"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/auth/fetchWithAuth";
import SubscriptionStatusBadge from "@/components/admin/SubscriptionStatusBadge";
import CustomerDrawer from "@/components/admin/CustomerDrawer";

interface Customer {
  user_id: string;
  name?: string;
  email: string;
  plan?: string;
  subscription_status?: string;
  coupon_code?: string | null;
}

export default function CustomersTable() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);

  function loadCustomers() {
    fetchWithAuth("/api/admin/customers")
      .then((r) => r.json())
      .then((d) => setCustomers(d.customers ?? []));
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  async function liberarFundadorRapido(c: Customer) {
    const ok = window.confirm(`Liberar Plano Fundador para ${c.email}? (12 meses, manual)`);
    if (!ok) return;
    const res = await fetchWithAuth("/api/admin/customers/activate-founder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: c.user_id }),
    });
    const data = await res.json();
    if (!res.ok) {
      window.alert(data.error ?? "Erro ao liberar plano.");
      return;
    }
    loadCustomers();
    if (selected?.user_id === c.user_id) {
      setSelected({ ...c, plan: "fundador", subscription_status: "active" });
    }
  }

  const filtered = customers.filter((c) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      c.email.toLowerCase().includes(q) ||
      (c.name ?? "").toLowerCase().includes(q) ||
      (c.plan ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <input
        type="search"
        className="gp-admin-filter mb-4"
        placeholder="Filtrar por e-mail, nome ou plano…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <table className="gp-admin-table">
        <thead>
          <tr>
            <th>E-mail</th>
            <th>Nome</th>
            <th>Plano</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {filtered.map((c) => (
            <tr key={c.user_id}>
              <td>{c.email}</td>
              <td>{c.name ?? "—"}</td>
              <td>{c.plan ?? "free"}</td>
              <td>
                <SubscriptionStatusBadge status={c.subscription_status} />
              </td>
              <td className="gp-admin-table__actions">
                {c.plan !== "fundador" && (
                  <button
                    type="button"
                    className="gp-btn gp-btn--secondary gp-btn--sm"
                    onClick={() => liberarFundadorRapido(c)}
                  >
                    Liberar Fundador
                  </button>
                )}
                <button
                  type="button"
                  className="gp-btn gp-btn--ghost gp-btn--sm"
                  onClick={() => setSelected(c)}
                >
                  Detalhes
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <CustomerDrawer
        customer={selected}
        onClose={() => setSelected(null)}
        onUpdated={loadCustomers}
      />
    </div>
  );
}
