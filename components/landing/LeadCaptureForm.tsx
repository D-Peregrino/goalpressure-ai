"use client";

import { useState } from "react";

export default function LeadCaptureForm({
  source = "landing",
  showCoupon = false,
}: {
  source?: string;
  showCoupon?: boolean;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cupom, setCupom] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        phone,
        source,
        couponCode: cupom || undefined,
        interest: "plano_fundador",
      }),
    });
    const data = await res.json();
    if (!res.ok) setErro(data.error ?? "Erro ao enviar.");
    else setMsg(data.message ?? "Recebemos seu contato.");
  }

  return (
    <form onSubmit={submit} className="gp-lead-form">
      {msg && <p className="gp-lead-form__ok">{msg}</p>}
      {erro && <p className="gp-lead-form__erro">{erro}</p>}
      <input
        className="gp-lead-form__input"
        placeholder="Seu nome"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="email"
        required
        className="gp-lead-form__input"
        placeholder="E-mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="gp-lead-form__input"
        placeholder="WhatsApp (opcional)"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      {showCoupon && (
        <input
          className="gp-lead-form__input"
          placeholder="Cupom BarbosaTips75"
          value={cupom}
          onChange={(e) => setCupom(e.target.value)}
        />
      )}
      <button type="submit" className="gp-btn gp-btn--primary w-full">
        Quero acesso fundador
      </button>
    </form>
  );
}
