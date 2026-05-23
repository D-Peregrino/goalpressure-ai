"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/auth/fetchWithAuth";
import SubscriptionStatusBadge from "@/components/admin/SubscriptionStatusBadge";

interface CustomerRow {
  user_id: string;
  name?: string;
  email: string;
  plan?: string;
  subscription_status?: string;
}

interface EventRow {
  id: string;
  type: string;
  description: string;
  created_at?: string;
}

interface NoteRow {
  id: string;
  note: string;
  created_at?: string;
}

export default function CustomerDrawer({
  customer,
  onClose,
  onUpdated,
}: {
  customer: CustomerRow | null;
  onClose: () => void;
  onUpdated?: () => void;
}) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [localPlan, setLocalPlan] = useState(customer?.plan);
  const [localStatus, setLocalStatus] = useState(customer?.subscription_status);

  useEffect(() => {
    setLocalPlan(customer?.plan);
    setLocalStatus(customer?.subscription_status);
    setActionMsg(null);
    setActionErr(null);
  }, [customer?.user_id, customer?.plan, customer?.subscription_status]);

  useEffect(() => {
    if (!customer?.user_id) return;
    fetchWithAuth(`/api/admin/customer-detail?userId=${encodeURIComponent(customer.user_id)}`)
      .then((r) => r.json())
      .then((d) => {
        setEvents(d.events ?? []);
        setNotes(d.notes ?? []);
        if (d.customer?.plan) setLocalPlan(d.customer.plan);
        if (d.customer?.subscription_status) {
          setLocalStatus(d.customer.subscription_status);
        }
      });
  }, [customer?.user_id]);

  if (!customer) return null;

  const isFundador = localPlan === "fundador" && localStatus === "active";

  async function liberarFundador() {
    if (!customer || isFundador) return;
    const ok = window.confirm(
      `Liberar Plano Fundador manualmente para ${customer.email}?\n\nVálido por 12 meses, sem cobrança.`
    );
    if (!ok) return;

    setActivating(true);
    setActionErr(null);
    setActionMsg(null);
    try {
      const res = await fetchWithAuth("/api/admin/customers/activate-founder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: customer.user_id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionErr(data.error ?? data.message ?? "Não foi possível liberar o plano.");
        return;
      }
      setLocalPlan("fundador");
      setLocalStatus("active");
      setActionMsg(data.message ?? "Plano Fundador liberado.");
      onUpdated?.();
      const detail = await fetchWithAuth(
        `/api/admin/customer-detail?userId=${encodeURIComponent(customer.user_id)}`
      ).then((r) => r.json());
      setEvents(detail.events ?? []);
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : "Erro de rede.");
    } finally {
      setActivating(false);
    }
  }

  async function addNote() {
    if (!noteText.trim() || !customer) return;
    setSaving(true);
    try {
      const res = await fetchWithAuth("/api/admin/support-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: customer.user_id, note: noteText }),
      });
      if (res.ok) {
        setNoteText("");
        const detail = await fetchWithAuth(
          `/api/admin/customer-detail?userId=${encodeURIComponent(customer.user_id)}`
        ).then((r) => r.json());
        setNotes(detail.notes ?? []);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="gp-admin-drawer-backdrop" role="presentation" onClick={onClose}>
      <aside
        className="gp-admin-drawer"
        role="dialog"
        aria-label="Detalhe do cliente"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="gp-admin-drawer__head">
          <div>
            <h2>{customer.name || "Cliente"}</h2>
            <p>{customer.email}</p>
          </div>
          <button type="button" className="gp-btn gp-btn--ghost" onClick={onClose}>
            Fechar
          </button>
        </header>

        <div className="gp-admin-drawer__meta">
          <span>Plano: {localPlan ?? "free"}</span>
          <SubscriptionStatusBadge status={localStatus} />
        </div>

        <section className="gp-admin-drawer__actions">
          <h3>Assinatura manual</h3>
          <p className="gp-admin-drawer__hint">
            Concede Plano Fundador ativo por 12 meses (provider: manual), sem pagamento.
          </p>
          {actionMsg && <p className="gp-auth-form__ok">{actionMsg}</p>}
          {actionErr && <p className="gp-auth-form__erro">{actionErr}</p>}
          <button
            type="button"
            className="gp-btn gp-btn--primary w-full"
            disabled={activating || isFundador}
            onClick={liberarFundador}
          >
            {activating
              ? "Liberando…"
              : isFundador
                ? "Já possui Plano Fundador"
                : "Liberar Plano Fundador"}
          </button>
        </section>

        <section>
          <h3>Notas internas</h3>
          <textarea
            className="gp-admin-drawer__textarea"
            rows={3}
            placeholder="Registrar interação ou follow-up…"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
          />
          <button
            type="button"
            className="gp-btn gp-btn--secondary"
            disabled={saving || !noteText.trim()}
            onClick={addNote}
          >
            {saving ? "Salvando…" : "Adicionar nota"}
          </button>
          <ul className="gp-admin-drawer__list">
            {notes.map((n) => (
              <li key={n.id}>
                <p>{n.note}</p>
                <time>{n.created_at ? new Date(n.created_at).toLocaleString("pt-BR") : ""}</time>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3>Eventos</h3>
          <ul className="gp-admin-drawer__list">
            {events.map((ev) => (
              <li key={ev.id}>
                <strong>{ev.type}</strong>
                <p>{ev.description}</p>
                <time>{ev.created_at ? new Date(ev.created_at).toLocaleString("pt-BR") : ""}</time>
              </li>
            ))}
            {events.length === 0 && <p className="text-[var(--muted)]">Nenhum evento registrado.</p>}
          </ul>
        </section>
      </aside>
    </div>
  );
}
