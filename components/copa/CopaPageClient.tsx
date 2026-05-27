"use client";

import { useCallback, useEffect, useState } from "react";
import type { CopaDataset, CopaSection } from "@/lib/copa/types";
import CopaShell from "@/components/copa/CopaShell";
import CopaOverview from "@/components/copa/sections/CopaOverview";
import CopaToday from "@/components/copa/sections/CopaToday";
import CopaCalendar from "@/components/copa/sections/CopaCalendar";
import CopaGroups from "@/components/copa/sections/CopaGroups";
import CopaStandings from "@/components/copa/sections/CopaStandings";
import CopaTeams from "@/components/copa/sections/CopaTeams";
import CopaStats from "@/components/copa/sections/CopaStats";
import CopaFavorites from "@/components/copa/sections/CopaFavorites";
import CopaAlerts from "@/components/copa/sections/CopaAlerts";
import CopaGpi from "@/components/copa/sections/CopaGpi";
import CopaContext from "@/components/copa/sections/CopaContext";
import CopaReplaySection from "@/components/copa/sections/CopaReplay";
import CopaOpsSection from "@/components/copa/sections/CopaOps";
import CopaLeadCapture from "@/components/copa/CopaLeadCapture";
import CopaSeasonalBanner from "@/components/copa/CopaSeasonalBanner";
import CopaDataSourceBanner from "@/components/copa/CopaDataSourceBanner";
import Link from "next/link";

const TABS: { id: CopaSection; label: string; premium?: boolean }[] = [
  { id: "overview", label: "Visão geral" },
  { id: "today", label: "Hoje" },
  { id: "calendar", label: "Calendário" },
  { id: "groups", label: "Grupos" },
  { id: "standings", label: "Classificação" },
  { id: "teams", label: "Seleções" },
  { id: "stats", label: "Estatísticas" },
  { id: "favorites", label: "Favoritos" },
  { id: "alerts", label: "Alertas", premium: true },
  { id: "gpi", label: "GPI", premium: true },
  { id: "replay", label: "Replay", premium: true },
];

export default function CopaPageClient() {
  const [data, setData] = useState<CopaDataset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<CopaSection>("overview");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/copa");
      const json = (await res.json()) as { ok?: boolean; data?: CopaDataset; error?: string };
      if (!json.ok || !json.data) {
        setError(json.error ?? "Falha ao carregar dados da Copa");
        return;
      }
      setData(json.data);
      setError(null);
    } catch {
      setError("Erro de rede ao carregar a Copa");
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(load, 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  const liveMatches = data?.today.filter((m) => m.isLive) ?? [];

  return (
    <CopaShell>
      <nav className="gp-copa-nav" aria-label="Seções Copa 2026">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`gp-copa-nav__tab ${section === tab.id ? "is-active" : ""} ${tab.premium ? "gp-copa-nav__tab--premium" : ""}`}
            onClick={() => setSection(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {error ? (
        <p className="gp-copa-premium-note" role="alert">
          {error}
        </p>
      ) : null}

      {!data ? (
        <p className="gp-copa-loading">Carregando GoalPressure Copa 2026…</p>
      ) : (
        <>
          <CopaDataSourceBanner data={data} />
          {section === "overview" ? <CopaOverview data={data} /> : null}
          {section === "today" ? <CopaToday matches={data.today} /> : null}
          {section === "calendar" ? <CopaCalendar days={data.calendar} /> : null}
          {section === "groups" ? <CopaGroups groups={data.groups} /> : null}
          {section === "standings" ? <CopaStandings rows={data.standings} /> : null}
          {section === "teams" ? <CopaTeams teams={data.teams} /> : null}
          {section === "stats" ? <CopaStats stats={data.stats} /> : null}
          {section === "favorites" ? <CopaFavorites data={data} /> : null}
          {section === "alerts" ? <CopaAlerts data={data} /> : null}
          {section === "gpi" ? (
            <>
              <CopaGpi />
              <div style={{ marginTop: "1rem" }}>
                <CopaContext liveMatches={liveMatches} />
              </div>
            </>
          ) : null}
          {section === "replay" ? (
            <>
              <CopaReplaySection />
              <div style={{ marginTop: "1rem" }}>
                <CopaOpsSection />
              </div>
            </>
          ) : null}
          <CopaLeadCapture source={`copa-tab-${section}`} />
          <p style={{ textAlign: "center", marginTop: "1rem" }}>
            <Link href="/copa/alertas" className="gp-copa-btn">
              Saiba mais sobre alertas da Copa
            </Link>
          </p>
        </>
      )}
    </CopaShell>
  );
}
