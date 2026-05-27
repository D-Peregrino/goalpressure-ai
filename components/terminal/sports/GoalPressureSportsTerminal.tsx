"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import {
  useLiveMatchCenter,
  type MatchCenterFilter,
} from "@/hooks/useLiveMatchCenter";
import DispatchPushSubscriber from "@/components/terminal/DispatchPushSubscriber";
import { feedStatusLabel } from "@/lib/terminal/formatDisplay";
import { cn } from "@/lib/utils";
import MatchDetailModal from "./MatchDetailModal";
import MatchWatchCard from "./MatchWatchCard";
import SportsToast from "./SportsToast";
import type { MatchTabId } from "./LiveMatchTabs";
import { evaluateMatchContext } from "@/components/terminal/intelligence/ContextEngine";
import { consumeTerminalCommand } from "@/lib/command/readPendingCommand";

type TerminalSegment = "live" | "upcoming" | "finished";

const SEGMENT_FILTERS: {
  segment: TerminalSegment;
  filter: MatchCenterFilter;
  label: string;
}[] = [
  { segment: "live", filter: "live", label: "Ao vivo" },
  { segment: "upcoming", filter: "upcoming", label: "Futuros" },
  { segment: "finished", filter: "finished", label: "Encerrados" },
];

function defaultTab(match: { isLive: boolean }): MatchTabId {
  return match.isLive ? "live" : "pre";
}

export default function GoalPressureSportsTerminal() {
  const {
    matches,
    kpis,
    filter,
    setFilter,
    search,
    setSearch,
    favorites,
    toggleFavorite,
    feedStatus,
    isLoading,
    dataSourceBadge,
    feedError,
  } = useLiveMatchCenter();

  const [segment, setSegment] = useState<TerminalSegment>("live");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [activeTabs, setActiveTabs] = useState<Record<string, MatchTabId>>({});
  const [timelineWindow, setTimelineWindow] = useState<"total" | "10" | "5">("total");
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => setToast(msg), []);

  useEffect(() => {
    const pending = consumeTerminalCommand();
    if (!pending) return;
    if (pending.filter) setFilter(pending.filter as MatchCenterFilter);
    if (pending.search) setSearch(pending.search);
  }, [setFilter, setSearch]);

  useEffect(() => {
    const seg = SEGMENT_FILTERS.find((s) => s.filter === filter);
    if (seg) setSegment(seg.segment);
    if (filter === "favorites") setShowFavoritesOnly(true);
  }, [filter]);

  const pool = useMemo(() => {
    let list = matches;
    if (showFavoritesOnly || filter === "favorites") {
      list = list.filter((m) => favorites.has(m.fixtureId));
    }
    return list;
  }, [matches, showFavoritesOnly, filter, favorites]);

  const expanded = useMemo(
    () => (expandedMatch ? pool.find((m) => m.fixtureId === expandedMatch) ?? null : null),
    [expandedMatch, pool]
  );

  const getActiveTab = useCallback(
    (fixtureId: string, match: { isLive: boolean }) =>
      activeTabs[fixtureId] ?? defaultTab(match),
    [activeTabs]
  );

  const setActiveTab = useCallback((fixtureId: string, tab: MatchTabId) => {
    setActiveTabs((prev) => ({ ...prev, [fixtureId]: tab }));
  }, []);

  const onSegment = useCallback(
    (seg: TerminalSegment) => {
      const row = SEGMENT_FILTERS.find((s) => s.segment === seg);
      if (row) {
        setSegment(seg);
        setFilter(row.filter);
        setShowFavoritesOnly(false);
      }
    },
    [setFilter]
  );

  const segmentCount = (seg: TerminalSegment) => {
    if (seg === "live") return kpis.live;
    if (seg === "upcoming") return kpis.upcoming;
    return kpis.finished;
  };

  const skeletonCount = typeof window !== "undefined" && window.innerWidth >= 1440 ? 8 : 6;

  return (
    <div className="gp-watch">
      <DispatchPushSubscriber />
      <SportsToast message={toast} onClose={() => setToast(null)} />

      <header className="gp-watch__header">
        <div className="gp-watch__header-inner">
          <div className="gp-watch__brand-row">
            <Link href="/" className="gp-watch__brand">
              GoalPressure <em>Terminal</em>
            </Link>
            <span className="gp-watch__meta">
              {dataSourceBadge ?? "SportMonks"} · {feedStatusLabel(feedStatus)}
            </span>
          </div>

          <nav className="gp-watch__tabs" aria-label="Segmentos de jogos">
            {SEGMENT_FILTERS.map((item) => (
              <button
                key={item.segment}
                type="button"
                className={cn(
                  "gp-watch__tab",
                  segment === item.segment && !showFavoritesOnly && "gp-watch__tab--on"
                )}
                onClick={() => onSegment(item.segment)}
              >
                {item.label}
                {segmentCount(item.segment) > 0 ? (
                  <span className="gp-watch__tab-count">
                    {segmentCount(item.segment) > 99 ? "99+" : segmentCount(item.segment)}
                  </span>
                ) : null}
              </button>
            ))}
            <button
              type="button"
              className={cn("gp-watch__tab", showFavoritesOnly && "gp-watch__tab--on")}
              onClick={() => {
                setShowFavoritesOnly(true);
                setFilter("favorites");
              }}
            >
              <Star className="h-4 w-4" strokeWidth={2} />
              Favoritos
              {favorites.size > 0 ? (
                <span className="gp-watch__tab-count">{favorites.size}</span>
              ) : null}
            </button>
          </nav>
        </div>

        <div className="gp-watch__toolbar">
          <input
            type="search"
            className="gp-watch__search"
            placeholder="Buscar time ou campeonato…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar jogos"
          />
        </div>
      </header>

      {feedError ? <p className="gp-watch__alert">{feedError}</p> : null}

      <main className="gp-watch__main">
        <div className="gp-watch__grid" role="list">
          {isLoading ? (
            Array.from({ length: skeletonCount }, (_, i) => (
              <div key={i} className="gp-watch__skeleton" aria-hidden />
            ))
          ) : pool.length === 0 ? (
            <div className="gp-watch__state">
              <h3>Nenhum jogo neste filtro</h3>
              <p>
                {showFavoritesOnly
                  ? "Toque na estrela de um jogo para adicioná-lo aos favoritos."
                  : "Troque a aba ou aguarde a próxima atualização dos dados."}
              </p>
            </div>
          ) : (
            pool.map((m) => (
              <MatchWatchCard
                key={m.fixtureId}
                match={m}
                isFavorite={favorites.has(m.fixtureId)}
                onOpen={() => setExpandedMatch(m.fixtureId)}
                onToggleFavorite={() => {
                  const was = favorites.has(m.fixtureId);
                  toggleFavorite(m.fixtureId);
                  showToast(was ? "Removido dos favoritos" : "Adicionado aos favoritos");
                }}
              />
            ))
          )}
        </div>
      </main>

      <footer className="gp-watch__footer">
        {pool.length > 0 ? `${pool.length} jogos · ` : ""}
        Atualização automática a cada 30s
      </footer>

      {expanded ? (
        <MatchDetailModal
          match={expanded}
          activeTab={getActiveTab(expanded.fixtureId, expanded)}
          onTabChange={(tab) => setActiveTab(expanded.fixtureId, tab)}
          timelineWindow={timelineWindow}
          onTimelineWindowChange={setTimelineWindow}
          isFavorite={favorites.has(expanded.fixtureId)}
          onToggleFavorite={() => {
            const was = favorites.has(expanded.fixtureId);
            toggleFavorite(expanded.fixtureId);
            showToast(was ? "Removido dos favoritos" : "Adicionado aos favoritos");
          }}
          onClose={() => setExpandedMatch(null)}
          contextView={evaluateMatchContext(expanded)}
        />
      ) : null}
    </div>
  );
}
