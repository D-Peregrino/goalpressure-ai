"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/auth/fetchWithAuth";
import type {
  TelegramDestination,
  TelegramDestinationType,
  TelegramDispatchLogRow,
} from "@/lib/telegram/telegramDestination.types";

type DestinationsResponse = {
  ok: boolean;
  destinations: TelegramDestination[];
  sandbox: boolean;
  routingConfigured: boolean;
  error?: string;
};

type LogsResponse = {
  ok: boolean;
  recent: TelegramDispatchLogRow[];
  failures: TelegramDispatchLogRow[];
  summary: { total: number; sent: number; failed: number };
  error?: string;
};

const EMPTY_FORM = {
  name: "",
  type: "channel" as TelegramDestinationType,
  chat_id: "",
  active: true,
  tags: "",
};

export default function TelegramDispatchAdmin() {
  const [destinations, setDestinations] = useState<TelegramDestination[]>([]);
  const [sandbox, setSandbox] = useState(true);
  const [routingConfigured, setRoutingConfigured] = useState(false);
  const [recent, setRecent] = useState<TelegramDispatchLogRow[]>([]);
  const [failures, setFailures] = useState<TelegramDispatchLogRow[]>([]);
  const [logSummary, setLogSummary] = useState({ total: 0, sent: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [destRes, logRes] = await Promise.all([
        fetchWithAuth("/api/admin/telegram/destinations"),
        fetchWithAuth("/api/admin/telegram/logs?limit=80"),
      ]);
      const destBody = (await destRes.json()) as DestinationsResponse;
      const logBody = (await logRes.json()) as LogsResponse;

      if (!destRes.ok) throw new Error(destBody.error ?? "Falha ao carregar destinos.");
      if (!logRes.ok) throw new Error(logBody.error ?? "Falha ao carregar logs.");

      setDestinations(destBody.destinations ?? []);
      setSandbox(destBody.sandbox);
      setRoutingConfigured(destBody.routingConfigured);
      setRecent(logBody.recent ?? []);
      setFailures(logBody.failures ?? []);
      setLogSummary(logBody.summary ?? { total: 0, sent: 0, failed: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro de carregamento.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function parseTags(raw: string): string[] {
    return raw
      .split(/[,;\n]/)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    const payload = {
      name: form.name,
      type: form.type,
      chat_id: form.chat_id,
      active: form.active,
      tags: parseTags(form.tags),
    };

    try {
      const res = editingId
        ? await fetchWithAuth(`/api/admin/telegram/destinations/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetchWithAuth("/api/admin/telegram/destinations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Falha ao salvar.");

      setForm(EMPTY_FORM);
      setEditingId(null);
      setMessage(editingId ? "Destino atualizado." : "Destino criado.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    }
  }

  function startEdit(dest: TelegramDestination) {
    setEditingId(dest.id);
    setForm({
      name: dest.name,
      type: dest.type,
      chat_id: dest.chat_id,
      active: dest.active,
      tags: dest.tags.join(", "),
    });
  }

  async function toggleActive(dest: TelegramDestination) {
    setBusyId(dest.id);
    try {
      const res = await fetchWithAuth(`/api/admin/telegram/destinations/${dest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !dest.active }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Falha ao atualizar status.");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro.");
    } finally {
      setBusyId(null);
    }
  }

  async function removeDestination(dest: TelegramDestination) {
    if (!window.confirm(`Excluir destino "${dest.name}"?`)) return;
    setBusyId(dest.id);
    try {
      const res = await fetchWithAuth(`/api/admin/telegram/destinations/${dest.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Falha ao excluir.");
      }
      if (editingId === dest.id) {
        setEditingId(null);
        setForm(EMPTY_FORM);
      }
      setMessage("Destino removido.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir.");
    } finally {
      setBusyId(null);
    }
  }

  async function testDestination(dest: TelegramDestination) {
    setBusyId(dest.id);
    setMessage(null);
    try {
      const res = await fetchWithAuth(`/api/admin/telegram/destinations/${dest.id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = (await res.json()) as { ok?: boolean; sandbox?: boolean; error?: string };
      if (!res.ok || !body.ok) throw new Error(body.error ?? "Teste falhou.");
      setMessage(
        body.sandbox
          ? `Teste sandbox registrado para ${dest.name}.`
          : `Mensagem enviada para ${dest.name}.`
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Teste falhou.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="gp-tg-admin">
      <header className="gp-tg-admin__hero">
        <div>
          <p className="gp-tg-admin__eyebrow">GoalPressure · Distribution</p>
          <h1 className="gp-admin-title gp-tg-admin__title">Telegram Dispatch</h1>
          <p className="gp-admin-sub">
            Gerencie destinatários sem variáveis de ambiente. Segmentação por tags,
            prioridade e tipo de alerta.
          </p>
        </div>
        <div className="gp-tg-admin__status-row">
          <span className={`gp-tg-pill ${sandbox ? "gp-tg-pill--warn" : "gp-tg-pill--ok"}`}>
            {sandbox ? "Sandbox ativo" : "Produção"}
          </span>
          <span className={`gp-tg-pill ${routingConfigured ? "gp-tg-pill--ok" : "gp-tg-pill--muted"}`}>
            {routingConfigured ? "Roteamento OK" : "Sem destinos"}
          </span>
          <span className="gp-tg-pill gp-tg-pill--muted">
            {logSummary.sent} envios · {logSummary.failed} falhas
          </span>
        </div>
      </header>

      {message && <p className="gp-val-message">{message}</p>}
      {error && (
        <div className="gp-val-api-error">
          <strong>Erro</strong>
          <p>{error}</p>
        </div>
      )}

      <div className="gp-tg-admin__grid">
        <section className="gp-tg-panel">
          <h2>{editingId ? "Editar destino" : "Novo destino"}</h2>
          <form className="gp-tg-form" onSubmit={submitForm}>
            <label>
              Nome
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Operações institucional"
              />
            </label>
            <label>
              Tipo
              <select
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    type: e.target.value as TelegramDestinationType,
                  }))
                }
              >
                <option value="channel">Canal</option>
                <option value="group">Grupo</option>
                <option value="user">Usuário</option>
              </select>
            </label>
            <label>
              Chat ID
              <input
                required
                value={form.chat_id}
                onChange={(e) => setForm((f) => ({ ...f, chat_id: e.target.value }))}
                placeholder="-1001234567890"
              />
            </label>
            <label>
              Tags (segmentação)
              <input
                value={form.tags}
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                placeholder="premium, autonomous, priority:alta"
              />
            </label>
            <p className="gp-tg-form__hint">
              Tags vazias = recebe todos os pipelines. Use{" "}
              <code>pipeline:premium</code>, <code>alert:tipo</code>,{" "}
              <code>priority:alta</code> (mínimo).
            </p>
            <label className="gp-tg-form__check">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              />
              Ativo
            </label>
            <div className="gp-tg-form__actions">
              <button type="submit" className="gp-tg-btn gp-tg-btn--primary">
                {editingId ? "Salvar alterações" : "Adicionar destino"}
              </button>
              {editingId && (
                <button
                  type="button"
                  className="gp-tg-btn"
                  onClick={() => {
                    setEditingId(null);
                    setForm(EMPTY_FORM);
                  }}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="gp-tg-panel gp-tg-panel--wide">
          <div className="gp-tg-panel__head">
            <h2>Destinatários</h2>
            <button type="button" className="gp-tg-btn" onClick={() => void load()} disabled={loading}>
              Atualizar
            </button>
          </div>
          {loading && destinations.length === 0 ? (
            <p className="gp-val-empty">Carregando…</p>
          ) : destinations.length === 0 ? (
            <p className="gp-val-empty">
              Nenhum destino cadastrado. Adicione um chat ID ou aplique o schema Supabase em
              Validação.
            </p>
          ) : (
            <div className="gp-tg-table-wrap">
              <table className="gp-admin-table gp-tg-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Tipo</th>
                    <th>Chat ID</th>
                    <th>Tags</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {destinations.map((d) => (
                    <tr key={d.id} className={!d.active ? "gp-tg-row--off" : undefined}>
                      <td>{d.name}</td>
                      <td>{d.type}</td>
                      <td>
                        <code>{d.chat_id}</code>
                      </td>
                      <td>
                        {d.tags.length === 0 ? (
                          <span className="gp-tg-tag gp-tg-tag--all">todas</span>
                        ) : (
                          d.tags.map((t) => (
                            <span key={t} className="gp-tg-tag">
                              {t}
                            </span>
                          ))
                        )}
                      </td>
                      <td>
                        <span
                          className={`gp-tg-pill ${d.active ? "gp-tg-pill--ok" : "gp-tg-pill--muted"}`}
                        >
                          {d.active ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="gp-tg-actions">
                        <button
                          type="button"
                          className="gp-tg-btn gp-tg-btn--sm"
                          disabled={busyId === d.id}
                          onClick={() => void testDestination(d)}
                        >
                          Testar
                        </button>
                        <button
                          type="button"
                          className="gp-tg-btn gp-tg-btn--sm"
                          disabled={busyId === d.id}
                          onClick={() => startEdit(d)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="gp-tg-btn gp-tg-btn--sm"
                          disabled={busyId === d.id}
                          onClick={() => void toggleActive(d)}
                        >
                          {d.active ? "Desativar" : "Ativar"}
                        </button>
                        <button
                          type="button"
                          className="gp-tg-btn gp-tg-btn--sm gp-tg-btn--danger"
                          disabled={busyId === d.id}
                          onClick={() => void removeDestination(d)}
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <div className="gp-tg-admin__logs">
        <section className="gp-tg-panel">
          <h2>Últimos envios</h2>
          {recent.length === 0 ? (
            <p className="gp-val-empty">Sem envios registrados.</p>
          ) : (
            <ul className="gp-tg-log-list">
              {recent.map((log) => (
                <li key={log.id} className="gp-tg-log-item">
                  <div className="gp-tg-log-item__top">
                    <span className="gp-tg-pill gp-tg-pill--ok">{log.status}</span>
                    <span>{log.pipeline}</span>
                    <time>{new Date(log.created_at).toLocaleString("pt-BR")}</time>
                  </div>
                  <p>
                    {log.destination_name ?? log.chat_id ?? "—"} ·{" "}
                    {log.message_preview?.slice(0, 120) ?? "—"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="gp-tg-panel">
          <h2>Falhas recentes</h2>
          {failures.length === 0 ? (
            <p className="gp-val-empty">Nenhuma falha recente.</p>
          ) : (
            <ul className="gp-tg-log-list">
              {failures.map((log) => (
                <li key={log.id} className="gp-tg-log-item gp-tg-log-item--fail">
                  <div className="gp-tg-log-item__top">
                    <span className="gp-tg-pill gp-tg-pill--danger">failed</span>
                    <span>{log.pipeline}</span>
                    <time>{new Date(log.created_at).toLocaleString("pt-BR")}</time>
                  </div>
                  <p>
                    <strong>{log.destination_name ?? log.chat_id}</strong> —{" "}
                    {log.error_message ?? "erro desconhecido"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
