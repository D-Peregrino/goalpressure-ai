"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

export default function PremiumNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`gpl-nav${scrolled ? " gpl-nav--scrolled" : ""}`}>
      <div className="gpl-nav__inner">
        <Link href="/" className="gpl-nav__brand">
          Goal<span>Pressure</span> AI
        </Link>
        <nav className="gpl-nav__links" aria-label="Navegação principal">
          <a href="#produto" className="gpl-nav__link">
            Produto
          </a>
          <a href="#central" className="gpl-nav__link">
            Central
          </a>
          <a href="#gpi" className="gpl-nav__link">
            GPI
          </a>
          <Link href="/copa" className="gpl-nav__link">
            Copa 2026
          </Link>
          <a href="#planos" className="gpl-nav__link">
            Planos
          </a>
        </nav>
        <div className="gpl-nav__actions">
          <Link href="/entrar" className="gpl-btn gpl-btn--ghost gpl-btn--sm gpl-nav__login">
            Entrar
          </Link>
          <Link href="/cadastro" className="gpl-btn gpl-btn--primary gpl-btn--sm">
            Começar grátis
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </header>
  );
}
