"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, LogOut, User, CreditCard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { planLabelPt } from "@/lib/subscription/permissions";
import PlanBadge from "@/components/billing/PlanBadge";
import CommandLauncher from "@/components/command/CommandLauncher";

export default function AppTopbar() {
  const { user, signOut, loading } = useAuth();
  const { plan, isAdmin } = useSubscription();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <header className="gp-app-topbar">
      <div className="gp-app-topbar__spacer" />
      <CommandLauncher />
      {loading ? (
        <span className="gp-app-topbar__loading">…</span>
      ) : user ? (
        <div className="gp-app-topbar__user" ref={ref}>
          <button
            type="button"
            className="gp-app-topbar__trigger"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-haspopup="menu"
          >
            <span className="gp-app-topbar__avatar" aria-hidden>
              {(user.name || user.email).charAt(0).toUpperCase()}
            </span>
            <span className="gp-app-topbar__meta">
              <span className="gp-app-topbar__name">{user.name || "Conta"}</span>
              <PlanBadge plan={plan} isAdmin={isAdmin} />
            </span>
            <ChevronDown className="h-4 w-4 opacity-70" />
          </button>
          {open && (
            <div className="gp-app-topbar__menu" role="menu">
              <p className="gp-app-topbar__menu-email">{user.email}</p>
              <p className="gp-app-topbar__menu-plan">{planLabelPt(plan)}</p>
              <Link href="/conta" className="gp-app-topbar__menu-item" role="menuitem" onClick={() => setOpen(false)}>
                <User className="h-4 w-4" />
                Minha conta
              </Link>
              <Link href="/precos" className="gp-app-topbar__menu-item" role="menuitem" onClick={() => setOpen(false)}>
                <CreditCard className="h-4 w-4" />
                Planos
              </Link>
              <button
                type="button"
                className="gp-app-topbar__menu-item gp-app-topbar__menu-item--danger"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  void signOut();
                }}
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="gp-app-topbar__guest">
          <Link href="/entrar" className="gp-btn gp-btn--ghost gp-btn--sm">
            Entrar
          </Link>
          <Link href="/cadastro" className="gp-btn gp-btn--primary gp-btn--sm">
            Criar conta
          </Link>
        </div>
      )}
    </header>
  );
}
