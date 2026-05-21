"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthLayout from "@/components/auth/AuthLayout";
import { useSubscription } from "@/contexts/SubscriptionContext";

export default function SignupPage() {
  const router = useRouter();
  const { login } = useSubscription();
  const [email, setEmail] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    login(email.trim(), "pro");
    router.push("/terminal");
  };

  return (
    <AuthLayout
      title="Trial Pro — 7 dias"
      subtitle="Experimente edge, steam e calibração de mercado."
    >
      <form onSubmit={submit} className="gp-auth-form">
        <label className="gp-auth-form__label">
          E-mail profissional
          <input
            type="email"
            required
            className="gp-auth-form__input"
            placeholder="trader@grupo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <button type="submit" className="gp-btn gp-btn--primary w-full">
          Iniciar trial
        </button>
        <p className="text-center text-sm text-[var(--muted)]">
          Já tem acesso?{" "}
          <Link href="/login" className="text-[var(--gp-red)] hover:underline">
            Login
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
