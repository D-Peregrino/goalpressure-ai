"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function LandingNav() {
  return (
    <header className="gp-landing-nav">
      <Link href="/" className="gp-landing-nav__brand">
        Goal<span className="gp-accent">Pressure</span> AI
      </Link>
      <nav className="gp-landing-nav__actions">
        <Link href="/precos" className="gp-landing-nav__link hidden md:inline">
          Planos
        </Link>
        <Link href="/entrar" className="gp-landing-nav__link hidden sm:inline">
          Entrar
        </Link>
        <Link href="/cadastro?cupom=BARBOSATIPS75" className="gp-btn gp-btn--primary gp-btn--sm">
          Plano Fundador
          <ArrowRight className="h-4 w-4" />
        </Link>
      </nav>
    </header>
  );
}
