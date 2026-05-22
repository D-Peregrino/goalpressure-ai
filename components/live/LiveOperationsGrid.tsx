"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import type { EnrichedLiveMatch, MatchCenterFilter } from "@/hooks/useLiveMatchCenter";
import VirtualizedMatchGrid from "@/components/terminal/VirtualizedMatchGrid";
import MatchGridSkeleton from "@/components/terminal/MatchGridSkeleton";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { UPGRADE_PATH } from "@/lib/subscription/commercialCopy";

const MAX_HISTORY = 24;

const FILTER_HINT: Partial<Record<MatchCenterFilter, string>> = {
  live: "Não há jogos ao vivo agora.",
  upcoming: "Não há partidas pré-jogo no feed.",
  high_pressure: "Nenhum jogo ao vivo com pressão alta no momento.",
  execute: "Nenhuma oportunidade ativa neste instante.",
  ev_plus: "Nenhuma boa chance destacada agora.",
  favorites: "Você ainda não favoritou nenhum jogo.",
};

export default function LiveOperationsGrid({
  matches,
  allMatches,
  filter,
  favorites,
  onToggleFavorite,
  viewMode,
  isLoading,
  liveCount,
  upcomingCount,
  auditMode = false,
  highlightFixtureId,
}: {
  matches: EnrichedLiveMatch[];
  allMatches: EnrichedLiveMatch[];
  filter: MatchCenterFilter;
  favorites: Set<string>;
  onToggleFavorite: (fixtureId: string) => void;
  viewMode: "grid" | "list";
  isLoading?: boolean;
  liveCount: number;
  upcomingCount: number;
  auditMode?: boolean;
  highlightFixtureId?: string | null;
}) {
  const { limits, can } = useSubscription();
  const historyRef = useRef<Map<string, number[]>>(new Map());

  useEffect(() => {
    for (const m of matches) {
      const prev = historyRef.current.get(m.fixtureId) ?? [];
      historyRef.current.set(m.fixtureId, [...prev, m.pressureScore].slice(-MAX_HISTORY));
    }
  }, [matches]);

  const capped = matches.slice(0, limits.liveMatches);

  if (isLoading && allMatches.length === 0) {
    return <MatchGridSkeleton count={limits.liveMatches} />;
  }

  if (capped.length === 0) {
    const hasPre = upcomingCount > 0;
    const hasAny = allMatches.length > 0;

    return (
      <div className="gp-empty-state">
        <p>{FILTER_HINT[filter] ?? "Nenhum jogo neste filtro."}</p>
        {filter === "live" && hasPre && (
          <p className="gp-empty-state__sub">
            Há {upcomingCount} partida{upcomingCount !== 1 ? "s" : ""} pré-jogo no feed — use o
            filtro <strong>Próximos</strong> ou <strong>Todos</strong>.
          </p>
        )}
        {filter !== "all" && hasAny && !hasPre && liveCount === 0 && (
          <p className="gp-empty-state__sub">
            {allMatches.length} jogo{allMatches.length !== 1 ? "s" : ""} no feed — tente{" "}
            <strong>Todos</strong>.
          </p>
        )}
        {!hasAny && (
          <p className="gp-empty-state__sub">
            Aguarde o próximo ciclo do feed ou verifique /api/debug/live-tracking.
          </p>
        )}
      </div>
    );
  }

  return (
    <motion.div
      layout
      transition={{ layout: { duration: 0.38, ease: [0.22, 1, 0.36, 1] } }}
      className="gp-ops-grid-wrap gp-ops-grid-wrap--stable"
    >
      {!can("unlimited_matches") && matches.length > limits.liveMatches && (
        <p className="gp-tier-notice">
          Plano Free: exibindo {limits.liveMatches} de {matches.length} jogos.{" "}
          <a href={UPGRADE_PATH}>Desbloquear Pro</a>
        </p>
      )}
      <VirtualizedMatchGrid
        matches={capped}
        favorites={favorites}
        onToggleFavorite={onToggleFavorite}
        viewMode={viewMode}
        historyRef={historyRef}
        auditMode={auditMode}
        highlightFixtureId={highlightFixtureId}
      />
    </motion.div>
  );
}
