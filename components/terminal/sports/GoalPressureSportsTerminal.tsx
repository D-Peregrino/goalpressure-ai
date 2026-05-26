"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Bell,
  CircleHelp,
  Globe,
  Menu,
  MonitorPlay,
  Scan,
  Settings,
  Sun,
  User,
  X,
} from "lucide-react";
import { useLiveMatchCenter, type MatchCenterFilter } from "@/hooks/useLiveMatchCenter";
import LiveFeedEmptyState from "@/components/live/LiveFeedEmptyState";
import DispatchPushSubscriber from "@/components/terminal/DispatchPushSubscriber";
import MatchPanelCard from "./MatchPanelCard";
import { cn } from "@/lib/utils";

const FILTER_CHIPS: { id: MatchCenterFilter | "scanner"; label: string; filter?: MatchCenterFilter }[] = [
  { id: "all", label: "Todos", filter: "all" },
  { id: "live", label: "Ao vivo", filter: "live" },
  { id: "scanner", label: "Scanner" },
  { id: "favorites", label: "Favoritos", filter: "favorites" },
  { id: "upcoming", label: "Próximos", filter: "upcoming" },
  { id: "high_pressure", label: "Alta pressão", filter: "high_pressure" },
];

export default function GoalPressureSportsTerminal() {
  const {
    matches,
    allMatches,
    kpis,
    filter,
    setFilter,
    search,
    setSearch,
    favorites,
    toggleFavorite,
    feedStatus,
    source,
    feedError,
    isLoading,
    isEmpty,
    lastUpdated,
    responseTime,
    dataSourceBadge,
  } = useLiveMatchCenter();

  const pool = allMatches.length > 0 ? allMatches : matches;
  const livePool = useMemo(() => pool.filter((m) => m.isLive), [pool]);
  const upcomingPool = useMemo(() => pool.filter((m) => m.isPreMatch), [pool]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [listFilter, setListFilter] = useState<"live" | "upcoming">("live");

  const primary = useMemo(() => {
    if (selectedId) {
      const found = pool.find((m) => m.fixtureId === selectedId);
      if (found) return found;
    }
    return livePool[0] ?? pool[0] ?? null;
  }, [pool, livePool, selectedId]);

  const secondary = useMemo(() => {
    if (!primary) return upcomingPool[0] ?? null;
    const alt =
      listFilter === "live"
        ? livePool.find((m) => m.fixtureId !== primary.fixtureId)
        : upcomingPool.find((m) => m.fixtureId !== primary.fixtureId);
    return alt ?? upcomingPool[0] ?? livePool[1] ?? null;
  }, [primary, livePool, upcomingPool, listFilter]);

  const sideList = useMemo(() => {
    const base = listFilter === "live" ? livePool : upcomingPool.length ? upcomingPool : pool;
    return base.filter((m) => m.fixtureId !== primary?.fixtureId).slice(0, 12);
  }, [listFilter, livePool, upcomingPool, pool, primary]);

  useEffect(() => {
    if (!selectedId && primary) setSelectedId(primary.fixtureId);
  }, [primary, selectedId]);

  const onChip = useCallback(
    (chip: (typeof FILTER_CHIPS)[number]) => {
      if (chip.filter) setFilter(chip.filter);
      if (chip.id === "live") setListFilter("live");
      if (chip.id === "upcoming" || chip.id === "all") setListFilter("upcoming");
    },
    [setFilter]
  );

  return (
    <div className="gp-sports">
      <DispatchPushSubscriber />
      <header className="gp-sports__topbar">
        <Link href="/" className="gp-sports__brand">
          GoalPressure <span>AI</span>
        </Link>
        <nav className="gp-sports__nav" aria-label="Menu principal">
          {[
            { label: "Jogos", count: kpis.tracked },
            { label: "Ligas", count: Math.min(kpis.tracked, 120) },
            { label: "Ao vivo", count: kpis.live },
            { label: "Scanner", count: kpis.execute },
            { label: "Favoritos", count: favorites.size },
          ].map((item) => (
            <button key={item.label} type="button" className="gp-sports__nav-item">
              {item.label}
              {item.count > 0 ? (
                <span className="gp-sports__badge">{item.count > 99 ? "99+" : item.count}</span>
              ) : null}
            </button>
          ))}
        </nav>
        <div className="gp-sports__top-actions">
          <button type="button" className="gp-sports__icon-btn" aria-label="Alertas">
            <Bell className="h-4 w-4" />
          </button>
          <button type="button" className="gp-sports__icon-btn" aria-label="Idioma">
            <Globe className="h-4 w-4" />
          </button>
          <button type="button" className="gp-sports__icon-btn" aria-label="Tema">
            <Sun className="h-4 w-4" />
          </button>
          <button type="button" className="gp-sports__icon-btn" aria-label="Ajuda">
            <CircleHelp className="h-4 w-4" />
          </button>
          <button type="button" className="gp-sports__icon-btn" aria-label="Perfil">
            <User className="h-4 w-4" />
          </button>
          <button type="button" className="gp-sports__icon-btn" aria-label="Menu">
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="gp-sports__body">
        <aside className="gp-sports__rail" aria-label="Ferramentas">
          {[
            { icon: BarChart3, label: "Estatísticas" },
            { icon: MonitorPlay, label: "Jogos" },
            { icon: Scan, label: "Scanner" },
            { icon: Settings, label: "Configurações" },
            { icon: X, label: "Limpar" },
          ].map(({ icon: Icon, label }) => (
            <button key={label} type="button" className="gp-sports__rail-btn" title={label}>
              <Icon className="h-4 w-4" strokeWidth={1.75} />
            </button>
          ))}
        </aside>

        <div className="gp-sports__main">
          <div className="gp-sports__filters">
            {FILTER_CHIPS.map((chip) => (
              <button
                key={chip.id}
                type="button"
                className={cn(
                  "gp-sports__filter-chip",
                  ((chip.filter && filter === chip.filter) ||
                    (chip.id === "live" && listFilter === "live")) &&
                    "gp-sports__filter-chip--on"
                )}
                onClick={() => onChip(chip)}
              >
                {chip.label}
                {chip.id === "live" && kpis.live > 0 ? (
                  <span className="gp-sports__badge">{kpis.live}</span>
                ) : null}
              </button>
            ))}
            <input
              type="search"
              placeholder="Buscar time ou liga…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ml-auto max-w-[200px] rounded-full border border-[#e2e8f0] px-3 py-1.5 text-sm text-[#1B2430] outline-none focus:border-[#2563EB]"
            />
          </div>

          {isLoading ? (
            <p className="p-8 text-center text-[#6B7280]">Carregando jogos…</p>
          ) : isEmpty && pool.length === 0 ? (
            <LiveFeedEmptyState
              source={source}
              matchCount={0}
              lastUpdated={lastUpdated}
              responseTimeMs={responseTime}
              error={feedError}
            />
          ) : (
            <div className="gp-sports__grid">
              <div className="gp-sports__col-primary">
                {primary ? (
                  <MatchPanelCard
                    match={primary}
                    isFavorite={favorites.has(primary.fixtureId)}
                    onToggleFavorite={() => toggleFavorite(primary.fixtureId)}
                  />
                ) : (
                  <p className="gp-sports__pregame p-8">Nenhum jogo selecionado</p>
                )}
              </div>

              <div className="gp-sports__col-secondary flex flex-col gap-3">
                {secondary ? (
                  <MatchPanelCard
                    match={secondary}
                    compact
                    isFavorite={favorites.has(secondary.fixtureId)}
                    onToggleFavorite={() => toggleFavorite(secondary.fixtureId)}
                    onClose={() => setListFilter(listFilter === "live" ? "upcoming" : "live")}
                  />
                ) : null}

                <div className="gp-sports__panel-card overflow-hidden">
                  <div className="gp-sports__panel-top">
                    <span>
                      {listFilter === "live" ? "Jogos ao vivo" : "Próximos jogos"}
                    </span>
                    <button
                      type="button"
                      className="text-xs text-[#2563EB] font-medium"
                      onClick={() =>
                        setListFilter((f) => (f === "live" ? "upcoming" : "live"))
                      }
                    >
                      Alternar
                    </button>
                  </div>
                  {sideList.length === 0 ? (
                    <p className="p-4 text-sm text-[#6B7280] text-center">Aguardando jogos</p>
                  ) : (
                    sideList.map((m) => (
                      <button
                        key={m.fixtureId}
                        type="button"
                        className={cn(
                          "gp-sports__list-item w-full text-left border-0",
                          primary?.fixtureId === m.fixtureId && "gp-sports__list-item--on"
                        )}
                        onClick={() => setSelectedId(m.fixtureId)}
                      >
                        <div>
                          <div className="text-xs text-[#6B7280]">{m.league}</div>
                          <div className="text-sm font-semibold text-[#1B2430]">
                            {m.homeTeam} × {m.awayTeam}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold tabular-nums">
                            {m.scoreKnown
                              ? `${m.homeScore ?? 0}-${m.awayScore ?? 0}`
                              : "—"}
                          </div>
                          <div className="text-xs text-[#22A86B]">{m.minuteLabel}</div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {dataSourceBadge ? (
            <p className="px-4 pb-3 text-xs text-[#6B7280]">
              Fonte: {dataSourceBadge} · {feedStatus}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
