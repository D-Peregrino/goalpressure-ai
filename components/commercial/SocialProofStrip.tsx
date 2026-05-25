"use client";

import { useEffect, useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";
import type { LiveMatchesApiResponse } from "@/types/api";
import { applyPressureToMatch } from "@/lib/pressureScore";
import { isLiveStatus } from "@/lib/ui/matchFormatting";
import { getMatchLabel } from "@/types/domain";

type ProofItem = { label: string; detail: string; time: string };

export default function SocialProofStrip() {
  const [items, setItems] = useState<ProofItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/live-matches", { cache: "no-store" });
        const body = (await res.json()) as LiveMatchesApiResponse;
        if (cancelled) return;

        if (!res.ok || !body.ok) {
          setItems([]);
          return;
        }

        const live = body.matches
          .map((m) => applyPressureToMatch(m))
          .filter((m) => isLiveStatus(m.status))
          .sort((a, b) => b.pressure.score - a.pressure.score)
          .slice(0, 3);

        const built: ProofItem[] = live.map((m) => ({
          label:
            m.pressure.score >= 70
              ? "Pressão alta detectada"
              : "Jogo monitorado ao vivo",
          detail: `${getMatchLabel(m)} · ${m.minute}'`,
          time: "agora",
        }));

        setItems(built);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    const id = window.setInterval(load, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const display = useMemo(() => items, [items]);

  return (
    <section className="gp-social-proof" aria-label="Movimentações recentes">
      <header className="gp-social-proof__head">
        <TrendingUp className="h-4 w-4 text-[var(--gp-red)]" aria-hidden />
        <div>
          <p className="gp-type-title gp-social-proof__title">Movimentações recentes</p>
          <p className="gp-type-caption gp-social-proof__sub">
            Dados reais da SportMonks — sem promessa de resultado
          </p>
        </div>
      </header>
      {loading ? (
        <p className="gp-type-caption text-muted px-2">Sincronizando feed ao vivo…</p>
      ) : display.length === 0 ? (
        <p className="gp-type-caption text-muted px-2">
          Nenhuma partida ao vivo disponível no momento.
        </p>
      ) : (
        <ul className="gp-social-proof__list">
          {display.map((item) => (
            <li key={item.label + item.detail} className="gp-social-proof__item">
              <span className="gp-social-proof__label">{item.label}</span>
              <span className="gp-social-proof__detail">{item.detail}</span>
              <time className="gp-social-proof__time">{item.time}</time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
