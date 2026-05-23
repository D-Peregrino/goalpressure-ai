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
}: {
  customer: CustomerRow | null;
  onClose: () => void;
}) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!customer?.user_id) return;
    fetchWithAuth(`/api/admin/customer-detail?userId=${encodeURIComponent(customer.user_id)}`)
      .then((r) => r.json())
      .then((d) => {
        setEvents(d.events ?? []);
        setNotes(d.notes ?? []);
      });
  }, [customer?.user_id]);

  if (!customer) return null;

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
          <span>Plano: {customer.plan ?? "free"}</span>
          <SubscriptionStatusBadge status={customer.subscription_status} />
        </div>

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
