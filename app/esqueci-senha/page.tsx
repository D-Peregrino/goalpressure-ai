"use client";

import { useState } from "react";
import Link from "next/link";
import AuthLayout from "@/components/auth/AuthLayout";
import { useAuth } from "@/hooks/useAuth";

export default function EsqueciSenhaPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await resetPassword(email);
    if (res.error) setErro(res.error);
    else setMsg("Se o e-mail existir, enviaremos o link de redefinição.");
  }

  return (
    <AuthLayout title="Esqueci minha senha" subtitle="Recuperação via e-mail.">
      <form onSubmit={submit} className="gp-auth-form">
        {msg && <p className="gp-auth-form__ok">{msg}</p>}
        {erro && <p className="gp-auth-form__erro">{erro}</p>}
        <label className="gp-auth-form__label">
          E-mail
          <input
            type="email"
            required
            className="gp-auth-form__input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <button type="submit" className="gp-btn gp-btn--primary w-full">
          Enviar link
        </button>
        <p className="text-center text-sm">
          <Link href="/entrar">Voltar ao login</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
