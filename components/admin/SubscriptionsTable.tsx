"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/auth/fetchWithAuth";
import SubscriptionStatusBadge from "@/components/admin/SubscriptionStatusBadge";
import { formatarPreco } from "@/lib/subscription/plans";

interface Subscription {
  id: string;
  user_id: string;
  email?: string;
  name?: string;
  plan: string;
  status: string;
  provider?: string;
  coupon_code?: string | null;
  final_amount_cents?: number;
  current_period_end?: string;
  lastPayment?: {
    status?: string;
    provider?: string;
    provider_payment_id?: string;
    amount_cents?: number;
    created_at?: string;
  } | null;
}

export default function SubscriptionsTable() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [planFilter, setPlanFilter] = useState("");

  useEffect(() => {
    fetchWithAuth("/api/admin/subscriptions")
      .then((r) => r.json())
      .then((d) => setSubs(d.subscriptions ?? []));
  }, []);

  const filtered = planFilter ? subs.filter((s) => s.plan === planFilter) : subs;

  return (
    <div>
      <select
        className="gp-admin-filter mb-4"
        value={planFilter}
        onChange={(e) => setPlanFilter(e.target.value)}
      >
        <option value="">Todos os planos</option>
        <option value="free">Gratuito</option>
        <option value="fundador">Fundador</option>
        <option value="pro">Profissional</option>
        <option value="elite">Elite</option>
      </select>
      <table className="gp-admin-table">
        <thead>
          <tr>
            <th>Usuário</th>
            <th>Plano</th>
            <th>Status</th>
            <th>Valor</th>
            <th>Provedor</th>
            <th>Vencimento</th>
            <th>Último pagamento</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((s) => (
            <tr key={s.id}>
              <td>
                <div>
                  <strong>{s.name ?? "—"}</strong>
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--gp-gray)" }}>
                  {s.email ?? s.user_id}
                </div>
              </td>
              <td>{s.plan}</td>
              <td>
                <SubscriptionStatusBadge status={s.status} />
              </td>
              <td>
                {s.final_amount_cents != null ? formatarPreco(s.final_amount_cents) : "—"}
              </td>
              <td>{s.provider ?? "—"}</td>
              <td>
                {s.current_period_end
                  ? new Date(s.current_period_end).toLocaleDateString("pt-BR")
                  : "—"}
              </td>
              <td>
                {s.lastPayment ? (
                  <span style={{ fontSize: "0.78rem" }}>
                    {s.lastPayment.status ?? "—"} ·{" "}
                    {s.lastPayment.amount_cents != null
                      ? formatarPreco(Number(s.lastPayment.amount_cents))
                      : "—"}
                  </span>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
