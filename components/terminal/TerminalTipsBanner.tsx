"use client";

import { useState, memo } from "react";
import { X, Sparkles } from "lucide-react";
import { DICAS_RAPIDAS } from "@/lib/ux/sportsLanguage";

const STORAGE_KEY = "gp-tips-dismissed";

function TerminalTipsBannerInner() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      return localStorage.getItem(STORAGE_KEY) !== "1";
    } catch {
      return true;
    }
  });

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <aside className="gp-tips-banner">
      <div className="gp-tips-banner__head">
        <Sparkles className="h-4 w-4 text-[var(--gp-red)]" aria-hidden />
        <p className="gp-tips-banner__title">Primeira vez aqui?</p>
        <button type="button" onClick={dismiss} className="gp-tips-banner__close" aria-label="Fechar dicas">
          <X className="h-4 w-4" />
        </button>
      </div>
      <ul className="gp-tips-banner__list">
        {DICAS_RAPIDAS.map((d) => (
          <li key={d.id}>
            <strong>{d.titulo}</strong> — {d.texto}
          </li>
        ))}
      </ul>
    </aside>
  );
}

export default memo(TerminalTipsBannerInner);
