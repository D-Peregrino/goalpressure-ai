"use client";

import { useEffect, useState } from "react";
import SubscriptionStatusBadge from "@/components/admin/SubscriptionStatusBadge";
import { formatarPreco } from "@/lib/subscription/plans";

interface Payment {
  id: string;
  user_id?: string;
  email?: string;
  provider?: string;
  amount_cents: number;
  currency?: string;
  status?: string;
  coupon_code?: string | null;
  paid_at?: string;
  created_at?: string;
}

export default function PaymentsTable() {
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    fetch("/api/admin/payments", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setPayments(d.payments ?? []));
  }, []);

  return (
    <table className="gp-admin-table">
      <thead>
        <tr>
          <th>Data</th>
          <th>Valor</th>
          <th>Status</th>
          <th>Provedor</th>
          <th>Cupom</th>
        </tr>
      </thead>
      <tbody>
        {payments.map((p) => (
          <tr key={p.id}>
            <td>
              {p.paid_at || p.created_at
                ? new Date(p.paid_at ?? p.created_at!).toLocaleString("pt-BR")
                : "—"}
            </td>
            <td>{formatarPreco(p.amount_cents ?? 0)}</td>
            <td>
              <SubscriptionStatusBadge status={p.status} />
            </td>
            <td>{p.provider ?? "—"}</td>
            <td>{p.coupon_code ?? "—"}</td>
          </tr>
        ))}
        {payments.length === 0 && (
          <tr>
            <td colSpan={5} className="text-[var(--muted)]">
              Nenhum pagamento registrado.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
