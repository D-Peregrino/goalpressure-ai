"use client";

import { useState } from "react";
import Link from "next/link";
import AuthLayout from "@/components/auth/AuthLayout";
import { getSupabaseBrowser } from "@/lib/auth/supabaseClient";

export default function RedefinirSenhaPage() {
  const [password, setPassword] = useState("");
  const [ok, setOk] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setErro("Configure Supabase Auth para redefinir senha.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setErro(error.message);
    else setOk(true);
  }

  return (
    <AuthLayout title="Nova senha" subtitle="Defina sua nova senha de acesso.">
      <form onSubmit={submit} className="gp-auth-form">
        {ok ? (
          <p className="gp-auth-form__ok">
            Senha atualizada. <Link href="/entrar">Entrar</Link>
          </p>
        ) : (
          <>
            {erro && <p className="gp-auth-form__erro">{erro}</p>}
            <label className="gp-auth-form__label">
              Nova senha
              <input
                type="password"
                required
                minLength={6}
                className="gp-auth-form__input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button type="submit" className="gp-btn gp-btn--primary w-full">
              Salvar senha
            </button>
          </>
        )}
      </form>
    </AuthLayout>
  );
}
