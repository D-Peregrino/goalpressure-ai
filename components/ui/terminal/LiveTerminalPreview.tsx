"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { LiveMatchesApiResponse } from "@/types/api";
import type { Match } from "@/types/domain";
import DataSourceBadge from "@/components/ui/DataSourceBadge";
import { applyPressureToMatch } from "@/lib/pressureScore";

/** Preview do terminal na landing — somente dados de GET /api/live-matches */
export default function LiveTerminalPreview() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"sportmonks" | "seed" | "none">("sportmonks");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/live-matches", { cache: "no-store" });
        const body = (await res.json()) as LiveMatchesApiResponse;
        if (cancelled) return;

        if (!res.ok || !body.ok) {
          setMatches([]);
          setError(
            !body.ok && "error" in body
              ? body.error.message
              : `Erro ${res.status}`
          );
          setSource(
            !body.ok && "meta" in body ? body.meta.activeSource : "sportmonks"
          );
          return;
        }

        const enriched = body.matches.map((m) => applyPressureToMatch(m));
        setMatches(enriched.slice(0, 4));
        setSource(body.meta.activeSource ?? "sportmonks");
        setError(null);
      } catch (e) {
        if (!cancelled) {
          setMatches([]);
          setError(e instanceof Error ? e.message : "Falha ao carregar");
        }
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

  const top = matches[0];

  return (
    <div className="t-card t-card--glow overflow-hidden p-0 shadow-xl">
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.08] px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#FF2B2B] t-live-pulse" />
          <span className="t-label">Live Command Center</span>
        </div>
        <DataSourceBadge source={source} />
      </div>
      <div className="grid grid-cols-3 gap-3 p-5">
        {["Pressure", "Edge", "Conf."].map((l, i) => (
          <div
            key={l}
            className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-3 text-center"
          >
            <p className="t-label">{l}</p>
            <motion.p
              className="font-display text-xl font-bold t-accent mt-1.5"
              animate={{ opacity: [0.85, 1, 0.85] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.3 }}
            >
              {loading
                ? "…"
                : top
                  ? i === 0
                    ? Math.round(top.pressure.score)
                    : i === 1
                      ? top.odds?.primary?.toFixed(2) ?? "—"
                      : top.pressure.tier?.slice(0, 3) ?? "—"
                  : "—"}
            </motion.p>
          </div>
        ))}
      </div>
      <div className="space-y-2 px-5 pb-5 border-t border-white/[0.08] pt-4">
        {loading && (
          <p className="font-mono-data text-xs text-muted">Sincronizando SportMonks…</p>
        )}
        {!loading && matches.length === 0 && (
          <p className="font-mono-data text-xs text-muted">
            Nenhum jogo ao vivo na SportMonks agora.
          </p>
        )}
        {matches.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2.5"
          >
            <span className="font-mono-data text-[var(--text-on-dark)]">
              {m.homeTeam} x {m.awayTeam}
            </span>
            <span className="font-mono-data text-xs t-accent font-semibold">
              {Math.round(m.pressure.score)} P
            </span>
          </div>
        ))}
        {error && (
          <p className="font-mono-data text-[10px] text-amber-400/90">{error}</p>
        )}
      </div>
    </div>
  );
}
