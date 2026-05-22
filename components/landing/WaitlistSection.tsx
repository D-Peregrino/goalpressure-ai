"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";

export default function WaitlistSection() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          source: "waitlist",
          interest: "lista_espera",
        }),
      });
      if (!res.ok) throw new Error("fail");
      setStatus("ok");
      setEmail("");
    } catch {
      setStatus("error");
    }
  };

  return (
    <section id="waitlist" className="gp-landing-cta">
      <div className="gp-landing-container gp-landing-cta__inner">
        <p className="gp-landing-eyebrow text-center">Acesso antecipado</p>
        <h2 className="gp-landing-cta__title">Lista de espera — beta institucional</h2>
        <p className="gp-landing-cta__sub">
          Vagas limitadas para desks que operam live com edge e calibração de mercado.
        </p>
        <form onSubmit={submit} className="gp-waitlist-form">
          <input
            type="email"
            required
            placeholder="seu@email.com"
            className="gp-waitlist-form__input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            type="submit"
            className="gp-btn gp-btn--primary"
            disabled={status === "loading"}
          >
            {status === "loading" ? "Enviando…" : "Entrar na waitlist"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
        {status === "ok" && (
          <p className="gp-waitlist-form__ok">Inscrição confirmada. Obrigado.</p>
        )}
        {status === "error" && (
          <p className="gp-waitlist-form__err">Erro ao registrar. Tente novamente.</p>
        )}
      </div>
    </section>
  );
}
