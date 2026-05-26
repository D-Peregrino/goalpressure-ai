"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import type { TimelineWindow } from "@/lib/terminal/sportsDisplay";
import { cn } from "@/lib/utils";
import MatchDetailModal from "./MatchDetailModal";
import MatchPanelCard from "./MatchPanelCard";
import SportsToast from "./SportsToast";
import type { MatchTabId } from "./LiveMatchTabs";
import { evaluateMatchContext } from "@/components/terminal/intelligence/ContextEngine";

const FILTER_CHIPS: {
  id: MatchCenterFilter | "scanner";
  label: string;
  filter?: MatchCenterFilter;
}[] = [
  { id: "all", label: "Todos", filter: "all" },
  { id: "live", label: "Ao vivo", filter: "live" },
  { id: "scanner", label: "Scanner", filter: "execute" },
  { id: "favorites", label: "Favoritos", filter: "favorites" },
  { id: "upcoming", label: "Próximos", filter: "upcoming" },
  { id: "high_pressure", label: "Alta pressão", filter: "high_pressure" },
];

type TopSection = "jogos" | "ligas" | "aovivo" | "scanner" | "favoritos";
type RailTool = "stats" | "games" | "scanner" | "settings" | "clear";

function defaultTab(match: { isLive: boolean }): MatchTabId {
  return match.isLive ? "live" : "pre";
}

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

  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [hiddenMatches, setHiddenMatches] = useState<Set<string>>(() => new Set());
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [activeTabs, setActiveTabs] = useState<Record<string, MatchTabId>>({});
  const [timelineWindow, setTimelineWindow] = useState<TimelineWindow>("total");
  const [listFilter, setListFilter] = useState<"live" | "upcoming">("live");
  const [activeTopSection, setActiveTopSection] = useState<TopSection | null>(null);
  const [activeRail, setActiveRail] = useState<RailTool | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);

  const searchTerm = search;

  const sectionJogosRef = useRef<HTMLDivElement>(null);
  const sectionLigasRef = useRef<HTMLDivElement>(null);
  const sectionAoVivoRef = useRef<HTMLDivElement>(null);
  const sectionScannerRef = useRef<HTMLDivElement>(null);
  const sectionFavoritosRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback((msg: string) => setToast(msg), []);

  const pool = useMemo(() => {
    const base = searchTerm.trim()
      ? matches
      : allMatches.length > 0
        ? allMatches
        : matches;
    return base.filter((m) => !hiddenMatches.has(m.fixtureId));
  }, [matches, allMatches, searchTerm, hiddenMatches]);

  const rankedPool = useMemo(() => {
    return [...pool].sort((a, b) => {
      const aContext = evaluateMatchContext(a);
      const bContext = evaluateMatchContext(b);
      if (a.isLive !== b.isLive) return a.isLive ? -1 : 1;
      if (aContext.alerta !== bContext.alerta) {
        const rank = { crítico: 4, alto: 3, moderado: 2, baixo: 1 } as const;
        return rank[bContext.alerta] - rank[aContext.alerta];
      }
      return bContext.score - aContext.score;
    });
  }, [pool]);

  const livePool = useMemo(() => rankedPool.filter((m) => m.isLive), [rankedPool]);
  const upcomingPool = useMemo(() => rankedPool.filter((m) => m.isPreMatch), [rankedPool]);

  const primary = useMemo(() => {
    if (selectedMatch) {
      const found = pool.find((m) => m.fixtureId === selectedMatch);
      if (found) return found;
    }
    return livePool[0] ?? rankedPool[0] ?? null;
  }, [pool, livePool, rankedPool, selectedMatch]);

  const secondary = useMemo(() => {
    if (!primary) return upcomingPool[0] ?? null;
    const alt =
      listFilter === "live"
        ? livePool.find((m) => m.fixtureId !== primary.fixtureId)
        : upcomingPool.find((m) => m.fixtureId !== primary.fixtureId);
    return alt ?? upcomingPool[0] ?? livePool[1] ?? null;
  }, [primary, livePool, upcomingPool, listFilter]);

  const sideList = useMemo(() => {
    const base = listFilter === "live" ? livePool : upcomingPool.length ? upcomingPool : rankedPool;
    return base.filter((m) => m.fixtureId !== primary?.fixtureId).slice(0, 12);
  }, [listFilter, livePool, upcomingPool, rankedPool, primary]);

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

  const scrollToSection = useCallback((section: TopSection) => {
    const map: Record<TopSection, React.RefObject<HTMLDivElement | null>> = {
      jogos: sectionJogosRef,
      ligas: sectionLigasRef,
      aovivo: sectionAoVivoRef,
      scanner: sectionScannerRef,
      favoritos: sectionFavoritosRef,
    };
    setActiveTopSection(section);
    map[section].current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const onTopNav = useCallback(
    (section: TopSection) => {
      scrollToSection(section);
      switch (section) {
        case "jogos":
          setFilter("all");
          setListFilter("live");
          showToast("Exibindo todos os jogos");
          break;
        case "ligas":
          setFilter("all");
          showToast("Filtro por liga — use a busca para encontrar competições");
          break;
        case "aovivo":
          setFilter("live");
          setListFilter("live");
          showToast("Somente jogos ao vivo");
          break;
        case "scanner":
          setFilter("execute");
          showToast("Scanner: jogos com sinal de execução");
          break;
        case "favoritos":
          setFilter("favorites");
          showToast("Seus favoritos");
          break;
      }
    },
    [scrollToSection, setFilter, showToast]
  );

  const onChip = useCallback(
    (chip: (typeof FILTER_CHIPS)[number]) => {
      if (chip.filter) setFilter(chip.filter);
      if (chip.id === "live") setListFilter("live");
      if (chip.id === "upcoming" || chip.id === "all") setListFilter("upcoming");
      if (chip.id === "scanner") showToast("Scanner ativo — jogos com leitura de execução");
    },
    [setFilter, showToast]
  );

  const hideMatch = useCallback(
    (fixtureId: string) => {
      setHiddenMatches((prev) => new Set(prev).add(fixtureId));
      if (selectedMatch === fixtureId) setSelectedMatch(null);
      if (expandedMatch === fixtureId) setExpandedMatch(null);
      showToast("Painel ocultado — use Limpar na barra lateral para restaurar");
    },
    [selectedMatch, expandedMatch, showToast]
  );

  const onRail = useCallback(
    (tool: RailTool) => {
      setActiveRail(tool);
      switch (tool) {
        case "stats":
          scrollToSection("jogos");
          setSidePanelOpen(true);
          showToast("Painel de estatísticas aberto");
          break;
        case "games":
          scrollToSection("aovivo");
          setFilter("live");
          showToast("Lista de jogos ao vivo");
          break;
        case "scanner":
          scrollToSection("scanner");
          setFilter("execute");
          showToast("Scanner de oportunidades");
          break;
        case "settings":
          setSidePanelOpen((o) => !o);
          showToast(sidePanelOpen ? "Configurações recolhidas" : "Configurações rápidas");
          break;
        case "clear":
          setHiddenMatches(new Set());
          setSearch("");
          setExpandedMatch(null);
          showToast("Painéis restaurados e busca limpa");
          break;
      }
    },
    [scrollToSection, setFilter, setSearch, showToast, sidePanelOpen]
  );

  const onTopIcon = useCallback(
    (action: string) => {
      showToast(`${action} — recurso em breve nesta versão visual`);
    },
    [showToast]
  );

  return (
    <div className="gp-sports">
      <DispatchPushSubscriber />
      <SportsToast message={toast} onClose={() => setToast(null)} />

      <header className="gp-sports__topbar">
        <Link href="/" className="gp-sports__brand">
          GoalPressure <span>AI</span>
        </Link>
        <nav className="gp-sports__nav" aria-label="Menu principal">
          {(
            [
              { id: "jogos" as const, label: "Jogos", count: kpis.tracked },
              { id: "ligas" as const, label: "Ligas", count: Math.min(kpis.tracked, 120) },
              { id: "aovivo" as const, label: "Ao vivo", count: kpis.live },
              { id: "scanner" as const, label: "Scanner", count: kpis.execute },
              { id: "favoritos" as const, label: "Favoritos", count: favorites.size },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                "gp-sports__nav-item",
                activeTopSection === item.id && "gp-sports__nav-item--on"
              )}
              onClick={() => onTopNav(item.id)}
            >
              {item.label}
              {item.count > 0 ? (
                <span className="gp-sports__badge">{item.count > 99 ? "99+" : item.count}</span>
              ) : null}
            </button>
          ))}
        </nav>
        <div className="gp-sports__top-actions">
          <button
            type="button"
            className="gp-sports__icon-btn"
            aria-label="Alertas"
            onClick={() => onTopIcon("Alertas")}
          >
            <Bell className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="gp-sports__icon-btn"
            aria-label="Idioma"
            onClick={() => onTopIcon("Idioma")}
          >
            <Globe className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="gp-sports__icon-btn"
            aria-label="Tema"
            onClick={() => onTopIcon("Tema claro/escuro")}
          >
            <Sun className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="gp-sports__icon-btn"
            aria-label="Ajuda"
            onClick={() => onTopIcon("Ajuda")}
          >
            <CircleHelp className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="gp-sports__icon-btn"
            aria-label="Perfil"
            onClick={() => onTopIcon("Perfil")}
          >
            <User className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="gp-sports__icon-btn"
            aria-label="Menu"
            onClick={() => setSidePanelOpen((o) => !o)}
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="gp-sports__body">
        <aside className="gp-sports__rail" aria-label="Ferramentas">
          {(
            [
              { id: "stats" as const, icon: BarChart3, label: "Estatísticas" },
              { id: "games" as const, icon: MonitorPlay, label: "Jogos" },
              { id: "scanner" as const, icon: Scan, label: "Scanner" },
              { id: "settings" as const, icon: Settings, label: "Configurações" },
              { id: "clear" as const, icon: X, label: "Limpar" },
            ] as const
          ).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              className={cn("gp-sports__rail-btn", activeRail === id && "gp-sports__rail-btn--on")}
              title={label}
              aria-label={label}
              onClick={() => onRail(id)}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
            </button>
          ))}
        </aside>

        <div className="gp-sports__main">
          {sidePanelOpen ? (
            <aside className="gp-sports-side-panel">
              <h3>Configurações rápidas</h3>
              <p>Janela da timeline: {timelineWindow === "total" ? "Total" : `${timelineWindow} min`}</p>
              <button type="button" onClick={() => setTimelineWindow("total")}>
                Timeline: partida inteira
              </button>
              <button type="button" onClick={() => setTimelineWindow("10")}>
                Timeline: últimos 10 min
              </button>
              <button type="button" onClick={() => setTimelineWindow("5")}>
                Timeline: últimos 5 min
              </button>
              <button type="button" onClick={() => setSidePanelOpen(false)}>
                Fechar painel
              </button>
            </aside>
          ) : null}

          <div ref={sectionJogosRef} className="gp-sports__filters">
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
              value={searchTerm}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar jogos"
              className="ml-auto max-w-[220px] rounded-full border border-[#e2e8f0] px-3 py-1.5 text-sm text-[#1B2430] outline-none focus:border-[#2563EB]"
            />
          </div>

          <div ref={sectionLigasRef} className="sr-only" aria-hidden />
          <div ref={sectionAoVivoRef} />
          <div ref={sectionScannerRef} className="sr-only" aria-hidden />
          <div ref={sectionFavoritosRef} className="sr-only" aria-hidden />

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
                ) : (
                  <p className="gp-sports__pregame p-8">Nenhum jogo selecionado</p>
                )}
              </div>

              <div className="gp-sports__col-secondary flex flex-col gap-3">
                {secondary && !hiddenMatches.has(secondary.fixtureId) ? (
                  <MatchPanelCard
                    match={secondary}
                    compact
                    activeTab={getActiveTab(secondary.fixtureId, secondary)}
                    onTabChange={(tab) => setActiveTab(secondary.fixtureId, tab)}
                    timelineWindow={timelineWindow}
                    onTimelineWindowChange={setTimelineWindow}
                    isFavorite={favorites.has(secondary.fixtureId)}
                    onToggleFavorite={() => {
                      const was = favorites.has(secondary.fixtureId);
                      toggleFavorite(secondary.fixtureId);
                      showToast(was ? "Removido dos favoritos" : "Adicionado aos favoritos");
                    }}
                    onClose={() => hideMatch(secondary.fixtureId)}
                    onExpand={() => setExpandedMatch(secondary.fixtureId)}
                    contextView={evaluateMatchContext(secondary)}
                  />
                ) : null}

                <div className="gp-sports__panel-card overflow-hidden">
                  <div className="gp-sports__panel-top">
                    <span>
                      {listFilter === "live" ? "Jogos ao vivo" : "Próximos jogos"}
                      {searchTerm.trim() ? ` · busca: “${searchTerm.trim()}”` : ""}
                    </span>
                    <button
                      type="button"
                      className="text-xs text-[#2563EB] font-medium"
                      onClick={() => {
                        setListFilter((f) => (f === "live" ? "upcoming" : "live"));
                        showToast(
                          listFilter === "live"
                            ? "Mostrando próximos jogos"
                            : "Mostrando jogos ao vivo"
                        );
                      }}
                    >
                      Alternar
                    </button>
                  </div>
                  {sideList.length === 0 ? (
                    <p className="p-4 text-sm text-[#6B7280] text-center">
                      {searchTerm.trim()
                        ? "Nenhum jogo encontrado para esta busca"
                        : "Aguardando jogos"}
                    </p>
                  ) : (
                    sideList.map((m) => (
                      <button
                        key={m.fixtureId}
                        type="button"
                        className={cn(
                          "gp-sports__list-item w-full text-left border-0",
                          primary?.fixtureId === m.fixtureId && "gp-sports__list-item--on"
                        )}
                        onClick={() => {
                          setSelectedMatch(m.fixtureId);
                          showToast(`${m.homeTeam} × ${m.awayTeam} selecionado`);
                        }}
                      >
                        <div>
                          <div className="text-xs text-[#6B7280]">{m.league}</div>
                          <div className="text-sm font-semibold text-[#1B2430]">
                            {m.homeTeam} × {m.awayTeam}
                          </div>
                          <div className="text-[0.65rem] text-[#6B7280]">
                            Pressão {Math.round(m.pressureScore)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold tabular-nums">
                            {m.scoreKnown
                              ? `${m.homeScore ?? 0}×${m.awayScore ?? 0}`
                              : "—"}
                          </div>
                          <div className="text-xs text-[#22A86B]">{m.minuteLabel}</div>
                          <button
                            type="button"
                            className="gp-sports__list-fav"
                            aria-label={
                              favorites.has(m.fixtureId)
                                ? "Remover favorito"
                                : "Adicionar favorito"
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              const was = favorites.has(m.fixtureId);
                              toggleFavorite(m.fixtureId);
                              showToast(was ? "Favorito removido" : "Favorito adicionado");
                            }}
                          >
                            {favorites.has(m.fixtureId) ? "★" : "☆"}
                          </button>
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
              Fonte: {dataSourceBadge} · atualização: {feedStatus}
            </p>
          ) : null}
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
