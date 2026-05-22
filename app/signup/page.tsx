"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import type { SubscriptionTier } from "@/lib/subscription/tiers";
import { TIERS } from "@/lib/subscription/tiers";
import AuthLayout from "@/components/auth/AuthLayout";
import { useSubscription } from "@/contexts/SubscriptionContext";

function parsePlan(value: string | null): SubscriptionTier {
  if (value === "institutional" || value === "pro" || value === "free") return value;
  return "pro";
}

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const plan = parsePlan(params.get("plan"));
  const tierDef = TIERS[plan];
  const { login } = useSubscription();
  const [email, setEmail] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    login(email.trim(), plan === "free" ? "pro" : plan);
    router.push("/terminal");
  };

  return (
    <AuthLayout
      title={`Trial ${tierDef.name} — ${tierDef.trialDays || 7} dias`}
      subtitle={tierDef.description}
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

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <AuthLayout title="Carregando…" subtitle="">
          <p className="text-sm text-[var(--muted)]">Aguarde…</p>
        </AuthLayout>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
