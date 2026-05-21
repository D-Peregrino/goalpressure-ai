"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSubscription } from "@/contexts/SubscriptionContext";
import type { SubscriptionTier } from "@/lib/subscription/tiers";

export default function LoginForm() {
  const router = useRouter();
  const { login } = useSubscription();
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState<SubscriptionTier>("pro");
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    login(email.trim(), tier);
    router.push("/terminal");
  };

  return (
    <form onSubmit={submit} className="gp-auth-form">
      <label className="gp-auth-form__label">
        E-mail
        <input
          type="email"
          required
          autoComplete="email"
          className="gp-auth-form__input"
          placeholder="voce@desk.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="gp-auth-form__label">
        Plano (demo)
        <select
          className="gp-auth-form__input"
          value={tier}
          onChange={(e) => setTier(e.target.value as SubscriptionTier)}
        >
          <option value="free">Free</option>
          <option value="pro">Pro — trial 7 dias</option>
          <option value="institutional">Institutional — trial 14 dias</option>
        </select>
      </label>
      <button type="submit" className="gp-btn gp-btn--primary w-full" disabled={loading}>
        {loading ? "Entrando…" : "Entrar no terminal"}
      </button>
      <p className="gp-auth-form__hint">
        Autenticação preparada para Supabase/Stripe. Nesta build, o acesso é local (demo).
      </p>
      <p className="text-center text-sm text-[var(--muted)]">
        Sem conta?{" "}
        <Link href="/signup" className="text-[var(--gp-red)] hover:underline">
          Criar acesso trial
        </Link>
      </p>
    </form>
  );
}
