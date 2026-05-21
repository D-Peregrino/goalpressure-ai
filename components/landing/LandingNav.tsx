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
        <Link href="#features" className="gp-landing-nav__link hidden md:inline">
          Features
        </Link>
        <Link href="#pricing" className="gp-landing-nav__link hidden md:inline">
          Pricing
        </Link>
        <Link href="/login" className="gp-landing-nav__link hidden sm:inline">
          Login
        </Link>
        <Link href="/signup" className="gp-btn gp-btn--primary gp-btn--sm">
          Trial Pro
          <ArrowRight className="h-4 w-4" />
        </Link>
      </nav>
    </header>
  );
}
