"use client";

import { useState } from "react";
import { CUPOM_BARBOSATIPS75 } from "@/lib/subscription/plans";
import BarbosaTipsBadge from "@/components/copa/BarbosaTipsBadge";

type FormStatus = "idle" | "loading" | "ok" | "error";

export default function CopaLeadCapture({ source = "copa" }: { source?: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [telegram, setTelegram] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/copa/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, telegram, source }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setStatus("error");
        setErrorMsg(json.error ?? "Erro ao enviar.");
        return;
      }
      setStatus("ok");
      setName("");
      setEmail("");
      setTelegram("");
    } catch {
      setStatus("error");
      setErrorMsg("Falha de rede. Tente novamente.");
    }
  }

  return (
    <section id="copa-leads" className="gp-copa-lead">
      <div className="gp-copa-lead__grid">
        <div>
          <p className="gp-copa-card__title">Receba alertas da Copa no Telegram</p>
          <p className="gp-copa-lead__sub">
            GPI, pressão ofensiva, mercado atrasado e jogos críticos — leitura institucional da
            Copa 2026 direto no seu Telegram.
          </p>
          <BarbosaTipsBadge />
          <p className="gp-copa-lead__fundador">
            Plano Fundador com cupom{" "}
            <strong>{CUPOM_BARBOSATIPS75}</strong> — 75% no checkout.
          </p>
        </div>
        <form className="gp-copa-lead__form" onSubmit={submit}>
          <label>
            <span>Nome</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              autoComplete="name"
            />
          </label>
          <label>
            <span>E-mail</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              autoComplete="email"
            />
          </label>
          <label>
            <span>Telegram / usuário</span>
            <input
              type="text"
              value={telegram}
              onChange={(e) => setTelegram(e.target.value)}
              placeholder="@usuario"
              autoComplete="username"
            />
          </label>
          <button type="submit" className="gp-copa-btn gp-copa-btn--primary gp-copa-lead__submit">
            {status === "loading" ? "Enviando…" : "Quero receber alertas da Copa"}
          </button>
          {status === "ok" ? (
            <p className="gp-copa-lead__ok" role="status">
              Inscrição confirmada. Em breve você receberá novidades da Copa.
            </p>
          ) : null}
          {status === "error" ? (
            <p className="gp-copa-lead__err" role="alert">
              {errorMsg}
            </p>
          ) : null}
        </form>
      </div>
    </section>
  );
}
