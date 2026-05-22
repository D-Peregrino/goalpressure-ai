"use client";

import { TrendingUp } from "lucide-react";
import { SOCIAL_PROOF_ITEMS } from "@/lib/subscription/commercialCopy";

export default function SocialProofStrip() {
  return (
    <section className="gp-social-proof" aria-label="Movimentações recentes">
      <header className="gp-social-proof__head">
        <TrendingUp className="h-4 w-4 text-[var(--gp-red)]" aria-hidden />
        <div>
          <p className="gp-type-title gp-social-proof__title">Movimentações recentes</p>
          <p className="gp-type-caption gp-social-proof__sub">
            Leituras detectadas na central — sem promessa de resultado
          </p>
        </div>
      </header>
      <ul className="gp-social-proof__list">
        {SOCIAL_PROOF_ITEMS.map((item) => (
          <li key={item.label + item.time} className="gp-social-proof__item">
            <span className="gp-social-proof__label">{item.label}</span>
            <span className="gp-social-proof__detail">{item.detail}</span>
            <time className="gp-social-proof__time">{item.time}</time>
          </li>
        ))}
      </ul>
    </section>
  );
}
