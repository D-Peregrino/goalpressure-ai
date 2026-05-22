"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export default function AccountShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();

  return (
    <div className="gp-account-shell">
      <header className="gp-account-shell__header">
        <Link href="/" className="gp-account-shell__brand">
          Goal<span className="gp-accent">Pressure</span>
        </Link>
        <nav className="gp-account-shell__nav">
          <Link href="/terminal">Central ao vivo</Link>
          <Link href="/precos">Planos</Link>
          <button type="button" onClick={() => signOut()} className="gp-account-shell__sair">
            Sair
          </button>
        </nav>
      </header>
      <main className="gp-account-shell__main">
        {user ? children : (
          <p>
            <Link href="/entrar">Entre</Link> para ver sua conta.
          </p>
        )}
      </main>
    </div>
  );
}
