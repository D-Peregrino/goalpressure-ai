"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import InstitutionalLiveCard from "@/components/live/InstitutionalLiveCard";

const MAX_HISTORY = 24;

export default function LiveOperationsGrid({
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
      historyRef.current.set(m.fixtureId, [...prev, m.pressureScore].slice(-MAX_HISTORY));
    }
  }, [matches]);

  if (isLoading && matches.length === 0) {
    return (
      <div className="gp-empty-state">
        <div className="gp-empty-state__pulse" aria-hidden />
        <p>Sincronizando radar operacional…</p>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="gp-empty-state">
        <p>Nenhuma partida neste filtro.</p>
        <p className="gp-empty-state__sub">Aguarde o feed live ou ajuste os filtros.</p>
      </div>
    );
  }

  const gridClass =
    viewMode === "list" ? "gp-ops-grid gp-ops-grid--list" : "gp-ops-grid";

  return (
    <AnimatePresence mode="popLayout">
      <motion.div layout className={`w-full min-w-0 ${gridClass}`}>
        {matches.map((m) => (
          <InstitutionalLiveCard
            key={m.fixtureId}
            match={m}
            layout={viewMode}
            isFavorite={favorites.has(m.fixtureId)}
            onToggleFavorite={() => onToggleFavorite(m.fixtureId)}
            pressureHistory={historyRef.current.get(m.fixtureId)}
          />
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
