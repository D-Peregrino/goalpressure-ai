"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { logAdminAuth } from "@/lib/admin/adminAuthLog";
import { isReauthLoginRequest } from "@/lib/auth/routes";

export function LoginForm() {
  const { signIn } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const redirectAfter = params.get("redirect");
  const reauth = isReauthLoginRequest(params);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro(null);
    logAdminAuth("[ADMIN_LOGIN]", {
      scope: "login_form_submit",
      route: redirectAfter ?? undefined,
      extra: { reauth },
    });

    const res = await signIn(email, password, { redirectAfter });
    setLoading(false);
    if (res.error) {
      setErro(res.error);
      return;
    }

    const target =
      (redirectAfter?.startsWith("/") ? redirectAfter : null) ??
      res.redirectTo ??
      "/minha-central";

    logAdminAuth("[ADMIN_LOGIN]", {
      scope: "login_form_redirect",
      route: target,
    });
    router.replace(target);
  }

  return (
    <form onSubmit={submit} className="gp-auth-form">
      {reauth && redirectAfter && (
        <p className="gp-auth-form__info">
          Entre novamente para acessar <strong>{redirectAfter}</strong>.
        </p>
      )}
      {erro && (
        <div className="gp-auth-form__erro-card" role="alert">
          <strong>Não foi possível entrar</strong>
          <p>{erro}</p>
        </div>
      )}
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
      <label className="gp-auth-form__label">
        Senha
        <input
          type="password"
          required
          className="gp-auth-form__input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <button type="submit" className="gp-btn gp-btn--primary w-full" disabled={loading}>
        {loading ? "Entrando…" : "Entrar"}
      </button>
      <p className="text-center text-sm text-[var(--muted)]">
        <Link href="/esqueci-senha" className="text-[var(--gp-red)] hover:underline">
          Esqueci minha senha
        </Link>
      </p>
      <p className="text-center text-sm text-[var(--muted)]">
        Não tem conta?{" "}
        <Link href="/cadastro" className="text-[var(--gp-red)] hover:underline">
          Criar conta
        </Link>
      </p>
    </form>
  );
}

export function SignupForm() {
  const { signUp } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro(null);
    setInfo(null);
    const res = await signUp(name, email, password);
    setLoading(false);
    if (res.error) {
      setErro(res.error);
      return;
    }
    if (res.info) {
      setInfo(res.info);
      return;
    }
    const redirectAfter = params.get("redirect");
    router.push(
      (redirectAfter?.startsWith("/") ? redirectAfter : null) ??
        res.redirectTo ??
        "/minha-central"
    );
  }

  return (
    <form onSubmit={submit} className="gp-auth-form">
      {erro && (
        <div className="gp-auth-form__erro-card" role="alert">
          <strong>Erro ao criar conta</strong>
          <p>{erro}</p>
        </div>
      )}
      {info && <p className="gp-auth-form__ok">{info}</p>}
      <label className="gp-auth-form__label">
        Nome
        <input
          type="text"
          required
          className="gp-auth-form__input"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
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
      <label className="gp-auth-form__label">
        Senha (mín. 6 caracteres)
        <input
          type="password"
          required
          minLength={6}
          className="gp-auth-form__input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <button type="submit" className="gp-btn gp-btn--primary w-full" disabled={loading}>
        {loading ? "Criando…" : "Criar conta"}
      </button>
      <p className="text-center text-sm text-[var(--muted)]">
        Já tem conta?{" "}
        <Link href="/entrar" className="text-[var(--gp-red)] hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
