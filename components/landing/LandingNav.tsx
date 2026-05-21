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
        <Link href="/terminal" className="gp-landing-nav__link hidden sm:inline">
          Terminal
        </Link>
        <Link href="/terminal" className="gp-btn gp-btn--primary gp-btn--sm">
          Entrar
          <ArrowRight className="h-4 w-4" />
        </Link>
      </nav>
    </header>
  );
}
