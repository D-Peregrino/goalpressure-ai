"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useLiveMatchCenter } from "@/hooks/useLiveMatchCenter";
import LiveFeedEmptyState from "@/components/live/LiveFeedEmptyState";
import DispatchPushSubscriber from "@/components/terminal/DispatchPushSubscriber";
import PressureEnginePanel from "@/components/terminal/PressureEnginePanel";
import EVEnginePanel from "@/components/terminal/EVEnginePanel";
import OperationalIntelligencePanel from "@/components/terminal/OperationalIntelligencePanel";
import LearningEnginePanel from "@/components/terminal/LearningEnginePanel";
import AutonomousCorePanel from "@/components/terminal/AutonomousCorePanel";
import LiveCommandCenterPanel from "@/components/terminal/LiveCommandCenterPanel";
import LiveDispatchFeed from "@/components/terminal/LiveDispatchFeed";
import TerminalBloombergSidebar, {
  TerminalMobileMenuButton,
  type TerminalSectionId,
} from "@/components/terminal/dashboard/TerminalBloombergSidebar";
import TerminalGauge from "@/components/terminal/dashboard/TerminalGauge";
import LiveMatchTerminalCard from "@/components/terminal/dashboard/LiveMatchTerminalCard";
import TerminalChartsPanel from "@/components/terminal/dashboard/TerminalChartsPanel";
import TerminalPressureHeatmap from "@/components/terminal/dashboard/TerminalPressureHeatmap";
import TerminalSignalsTable from "@/components/terminal/dashboard/TerminalSignalsTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { feedStatusLabel, opsStatusLabel, roundDisplay } from "@/lib/terminal/formatDisplay";

function Section({
  id,
  title,
  children,
}: {
  id: TerminalSectionId;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="gp-bloomberg__section">
      <h2 className="gp-bloomberg__section-title">{title}</h2>
      {children}
    </section>
  );
}

export default function TerminalDashboard() {
  const [activeSection, setActiveSection] = useState<TerminalSectionId>("live-matches");
  const [mobileNav, setMobileNav] = useState(false);

  const {
    matches,
    allMatches,
    liveSignals,
    kpis,
    feedStatus,
    source,
    feedError,
    isLoading,
    isEmpty,
    lastUpdated,
    responseTime,
    opsStatus,
    dataSourceBadge,
  } = useLiveMatchCenter();

  const pool = allMatches.length > 0 ? allMatches : matches;

  const aggregates = useMemo(() => {
    const live = pool.filter((m) => m.isLive);
    const avgPressure =
      live.length > 0
        ? live.reduce((s, m) => s + m.pressureScore, 0) / live.length
        : 0;
    const avgChaos =
      live.length > 0 ? live.reduce((s, m) => s + m.chaosIndex, 0) / live.length : 0;
    const avgEv =
      live.filter((m) => m.ev != null).length > 0
        ? (live.reduce((s, m) => s + (m.ev ?? 0), 0) / live.filter((m) => m.ev).length) * 100
        : 0;
    const avgMomentum =
      live.length > 0 ? live.reduce((s, m) => s + m.momentum, 0) / live.length : 0;
    const avgEdge =
      live.filter((m) => m.edgePercent != null).length > 0
        ? live.reduce((s, m) => s + (m.edgePercent ?? 0), 0) /
          live.filter((m) => m.edgePercent != null).length
        : 0;
    return { avgPressure, avgChaos, avgEv, avgMomentum, avgEdge };
  }, [pool]);

  const onSelectSection = useCallback((id: TerminalSectionId) => {
    setActiveSection(id);
  }, []);

  const clock = useMemo(
    () =>
      lastUpdated
        ? new Date(lastUpdated).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        : "—",
    [lastUpdated]
  );

  return (
    <div className="gp-bloomberg gp-bloomberg__grid-bg">
      <DispatchPushSubscriber />

      <div className="gp-bloomberg__shell">
        <TerminalBloombergSidebar
          active={activeSection}
          onSelect={onSelectSection}
          mobileOpen={mobileNav}
          onMobileClose={() => setMobileNav(false)}
        />

        <div className="gp-bloomberg__main">
          <header className="gp-bloomberg__topbar">
            <div className="flex items-center gap-3 min-w-0">
              <TerminalMobileMenuButton onClick={() => setMobileNav(true)} />
              <div className="min-w-0">
                <p className="font-[family-name:var(--font-orbitron)] text-base font-semibold tracking-wide text-[#F4F7FA]">
                  Central de Inteligência Esportiva
                </p>
                <p className="text-[13px] text-[#AAB6C5] leading-snug max-w-xl">
                  Leitura em tempo real de pressão ofensiva, valor de mercado e alertas
                  operacionais.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={feedStatus === "live" ? "live" : "warn"}>
                Feed · {feedStatusLabel(feedStatus)}
              </Badge>
              <Badge variant="muted">Ops · {opsStatusLabel(opsStatus)}</Badge>
              <Badge variant="muted">{source}</Badge>
              <span className="gp-bloomberg__mono text-[11px] text-[#AAB6C5]">
                Atualizado {clock}
                {responseTime != null ? ` · ${responseTime} ms` : ""}
              </span>
              <Button variant="outline" size="sm" asChild>
                <Link href="/minha-central">Conta</Link>
              </Button>
            </div>
          </header>

          <div className="gp-bloomberg__scroll">
            <div className="gp-bloomberg__metrics-row">
              <TerminalGauge
                label="Pressão média"
                value={aggregates.avgPressure}
                accent
              />
              <TerminalGauge label="Índice de caos" value={aggregates.avgChaos} />
              <TerminalGauge label="Valor médio" value={aggregates.avgEv} unit="%" />
              <TerminalGauge
                label="Momento ofensivo"
                value={Math.round(aggregates.avgMomentum + 50)}
              />
              <TerminalGauge
                label="Distorção odd"
                value={aggregates.avgEdge}
                unit="%"
              />
              <TerminalGauge
                label="Jogos ao vivo"
                value={kpis.live}
                max={Math.max(kpis.live, 20)}
                accent={kpis.live > 0}
              />
            </div>

            <Section id="live-matches" title="Jogos ao vivo">
              {isEmpty && !isLoading && (
                <LiveFeedEmptyState
                  source={source}
                  matchCount={0}
                  lastUpdated={lastUpdated}
                  responseTimeMs={responseTime}
                  error={feedError}
                />
              )}
              {isLoading && pool.length === 0 && (
                <p className="text-sm text-[#AAB6C5] py-10 text-center">
                  Carregando jogos ao vivo…
                </p>
              )}
              <div className="gp-bloomberg__matches-grid">
                {matches.slice(0, 24).map((m) => (
                  <LiveMatchTerminalCard
                    key={m.fixtureId}
                    match={m}
                    dataSourceLabel={dataSourceBadge}
                  />
                ))}
              </div>
            </Section>

            <Section id="pressure-radar" title="Radar de pressão">
              <div className="gp-bloomberg__desk">
                <TerminalPressureHeatmap matches={pool} />
                <div className="space-y-3">
                  <TerminalChartsPanel matches={pool} />
                  <PressureEnginePanel matches={pool} activeSignals={liveSignals.length} />
                </div>
              </div>
            </Section>

            <Section id="ev-signals" title="Sinais de valor">
              <Tabs defaultValue="chart">
                <TabsList>
                  <TabsTrigger value="chart">Gráficos</TabsTrigger>
                  <TabsTrigger value="table">Tabela</TabsTrigger>
                  <TabsTrigger value="engine">Motor</TabsTrigger>
                </TabsList>
                <TabsContent value="chart">
                  <TerminalChartsPanel matches={pool} />
                </TabsContent>
                <TabsContent value="table">
                  <TerminalSignalsTable matches={pool} />
                </TabsContent>
                <TabsContent value="engine">
                  <EVEnginePanel matches={pool} />
                </TabsContent>
              </Tabs>
            </Section>

            <Section id="autonomous-core" title="Núcleo autônomo">
              <AutonomousCorePanel />
            </Section>

            <Section id="dispatch-center" title="Central de alertas">
              <div className="grid gap-3 lg:grid-cols-2">
                <LiveCommandCenterPanel />
                <LiveDispatchFeed />
              </div>
            </Section>

            <Section id="learning-layer" title="Aprendizado">
              <div className="grid gap-3 lg:grid-cols-2">
                <LearningEnginePanel />
                <OperationalIntelligencePanel matches={pool} />
              </div>
            </Section>

            <Section id="telegram-logs" title="Registros Telegram">
              <div className="gp-bloomberg__card-glow p-4">
                <p className="text-sm text-[#AAB6C5] mb-3">
                  Histórico de despachos e confirmações enviadas pelo canal operacional.
                </p>
                <LiveDispatchFeed />
              </div>
            </Section>

            <Section id="settings" title="Configurações">
              <div className="gp-bloomberg__card-glow p-5 max-w-lg">
                <p className="font-[family-name:var(--font-orbitron)] text-xs font-semibold mb-3 text-[#F4F7FA]">
                  Preferências da central
                </p>
                <ul className="space-y-2 text-sm text-[#AAB6C5]">
                  <li>· Tema: Sala de análise (ardósia)</li>
                  <li>· Fonte de dados: {source}</li>
                  <li>· Jogos visíveis: {roundDisplay(pool.length)}</li>
                  <li>
                    ·{" "}
                    <Link href="/conta" className="text-[#FF4D4D] hover:underline">
                      Gerenciar conta e plano
                    </Link>
                  </li>
                  <li>
                    ·{" "}
                    <Link href="/admin/validacao" className="text-[#FF4D4D] hover:underline">
                      Validação operacional (admin)
                    </Link>
                  </li>
                </ul>
              </div>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}
