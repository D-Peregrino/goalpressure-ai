"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import LiveMatchCard from "@/components/matches/LiveMatchCard";

const MAX_HISTORY = 24;

export default function LiveMatchGrid({
  matches,
  favorites,
  onToggleFavorite,
  viewMode,
  isLoading,
}: {
  matches: EnrichedLiveMatch[];
  favorites: Set<string>;
  onToggleFavorite: (fixtureId: string) => void;
  viewMode: "grid" | "list";
  isLoading?: boolean;
}) {
  const historyRef = useRef<Map<string, number[]>>(new Map());

  useEffect(() => {
    for (const m of matches) {
      const prev = historyRef.current.get(m.fixtureId) ?? [];
      const next = [...prev, m.pressureScore].slice(-MAX_HISTORY);
      historyRef.current.set(m.fixtureId, next);
    }
  }, [matches]);

  if (isLoading && matches.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] py-20 text-center">
        <p className="font-body text-sm text-[var(--muted)]">Carregando partidas ao vivo…</p>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] py-20 text-center">
        <p className="font-body text-sm text-[var(--muted)]">
          Nenhuma partida neste filtro. Ajuste filtros ou aguarde o feed live.
        </p>
      </div>
    );
  }

  const gridClass =
    viewMode === "list" ? "match-center-grid match-center-grid--list" : "match-center-grid";

  return (
    <motion.div layout className={`w-full min-w-0 ${gridClass}`}>
      {matches.map((m) => (
        <LiveMatchCard
          key={m.fixtureId}
          match={m}
          isFavorite={favorites.has(m.fixtureId)}
          onToggleFavorite={() => onToggleFavorite(m.fixtureId)}
          pressureHistory={historyRef.current.get(m.fixtureId)}
        />
      ))}
    </motion.div>
  );
}
