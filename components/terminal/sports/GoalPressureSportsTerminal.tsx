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
import MatchListRow from "./MatchListRow";
import MatchPanelCard from "./MatchPanelCard";
import SportsToast from "./SportsToast";
import type { MatchTabId } from "./LiveMatchTabs";
import { evaluateMatchContext } from "@/components/terminal/intelligence/ContextEngine";
import { mapOperationalDecision } from "@/components/terminal/decision/decisionMapper";
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
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
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

  const primary = useMemo(() => {
    if (selectedMatch) {
      const found = pool.find((m) => m.fixtureId === selectedMatch);
      if (found) return found;
    }
    return pool[0] ?? null;
  }, [pool, selectedMatch]);

  const sideList = useMemo(
    () => pool.filter((m) => m.fixtureId !== primary?.fixtureId).slice(0, 20),
    [pool, primary]
  );

  const expanded = useMemo(
    () => (expandedMatch ? pool.find((m) => m.fixtureId === expandedMatch) ?? null : null),
    [expandedMatch, pool]
  );

  useEffect(() => {
    if (!selectedMatch && primary) setSelectedMatch(primary.fixtureId);
  }, [primary, selectedMatch]);

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

  return (
    <div className="gp-sports">
      <DispatchPushSubscriber />
      <SportsToast message={toast} onClose={() => setToast(null)} />

      <header className="gp-sports__topbar">
        <Link href="/" className="gp-sports__brand">
          GoalPressure <span>Terminal</span>
        </Link>
        <nav className="gp-sports__nav" aria-label="Segmentos">
          {SEGMENT_FILTERS.map((item) => (
            <button
              key={item.segment}
              type="button"
              className={cn(
                "gp-sports__nav-item",
                segment === item.segment && !showFavoritesOnly && "gp-sports__nav-item--on"
              )}
              onClick={() => onSegment(item.segment)}
            >
              {item.label}
              {segmentCount(item.segment) > 0 ? (
                <span className="gp-sports__badge">
                  {segmentCount(item.segment) > 99 ? "99+" : segmentCount(item.segment)}
                </span>
              ) : null}
            </button>
          ))}
          <button
            type="button"
            className={cn(
              "gp-sports__nav-item",
              showFavoritesOnly && "gp-sports__nav-item--on"
            )}
            onClick={() => {
              setShowFavoritesOnly(true);
              setFilter("favorites");
              showToast("Somente favoritos");
            }}
          >
            <Star className="inline h-3.5 w-3.5 mr-1" />
            Favoritos
            {favorites.size > 0 ? (
              <span className="gp-sports__badge">{favorites.size}</span>
            ) : null}
          </button>
        </nav>
      </header>

      <div className="gp-sports__body gp-sports__body--core">
        <div className="gp-sports__main">
          <div className="gp-sports__filters">
            <input
              type="search"
              placeholder="Buscar time ou liga…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar jogos"
              className="w-full max-w-md rounded-full border border-[#e2e8f0] px-4 py-2 text-sm text-[#1B2430] outline-none focus:border-[#2563EB]"
            />
          </div>

          {feedError ? (
            <p className="mx-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {feedError}
            </p>
          ) : null}

          {isLoading ? (
            <p className="p-8 text-center text-[#6B7280]">Carregando jogos…</p>
          ) : pool.length === 0 ? (
            <div className="gp-sports__empty">
              <h3>Nenhum jogo neste filtro</h3>
              <p>
                {showFavoritesOnly
                  ? "Marque jogos com a estrela para vê-los aqui."
                  : "Aguarde a próxima atualização ou troque o segmento (ao vivo / futuros / encerrados)."}
              </p>
            </div>
          ) : (
            <div className="gp-sports__grid gp-sports__grid--core">
              <div className="gp-sports__col-primary">
                {primary ? (
                  <MatchPanelCard
                    match={primary}
                    highlight
                    activeTab={getActiveTab(primary.fixtureId, primary)}
                    onTabChange={(tab) => setActiveTab(primary.fixtureId, tab)}
                    timelineWindow={timelineWindow}
                    onTimelineWindowChange={setTimelineWindow}
                    isFavorite={favorites.has(primary.fixtureId)}
                    onToggleFavorite={() => {
                      const was = favorites.has(primary.fixtureId);
                      toggleFavorite(primary.fixtureId);
                      showToast(was ? "Removido dos favoritos" : "Adicionado aos favoritos");
                    }}
                    onExpand={() => setExpandedMatch(primary.fixtureId)}
                    contextView={evaluateMatchContext(primary)}
                  />
                ) : null}
              </div>

              <div className="gp-sports__col-secondary flex flex-col gap-0">
                <div className="gp-sports__panel-card overflow-hidden">
                  <div className="gp-sports__panel-top">
                    <span>Lista de jogos</span>
                    <span className="text-xs text-[#6B7280]">{pool.length} jogos</span>
                  </div>
                  {sideList.length === 0 ? (
                    <p className="p-4 text-sm text-[#6B7280] text-center">
                      Nenhum outro jogo nesta lista
                    </p>
                  ) : (
                    sideList.map((m) => {
                      const ctx = evaluateMatchContext(m);
                      const decision = mapOperationalDecision(m, ctx);
                      return (
                        <MatchListRow
                          key={m.fixtureId}
                          match={m}
                          decision={decision}
                          selected={primary?.fixtureId === m.fixtureId}
                          isFavorite={favorites.has(m.fixtureId)}
                          onSelect={() => setSelectedMatch(m.fixtureId)}
                          onToggleFavorite={() => {
                            const was = favorites.has(m.fixtureId);
                            toggleFavorite(m.fixtureId);
                            showToast(was ? "Favorito removido" : "Favorito adicionado");
                          }}
                        />
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          <p className="px-4 pb-3 text-xs text-[#6B7280]">
            {dataSourceBadge ? `Fonte: ${dataSourceBadge}` : "Fonte: SportMonks"}
            {" · "}
            Atualização: {feedStatusLabel(feedStatus)}
          </p>
        </div>
      </div>

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
