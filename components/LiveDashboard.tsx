"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useLiveMatches } from "@/hooks/useLiveMatches";
import { useSystemMetrics } from "@/hooks/useSystemMetrics";
import type { ServiceState, ServiceStatus } from "@/types/domain";
import { toLiveMatchView } from "@/types/domain";
import EngineTelemetryStrip from "@/components/engine/EngineTelemetryStrip";
import Header from "@/components/Header";
import { useEngineInsights } from "@/hooks/useEngineInsights";
import LiveGameCard from "@/components/LiveGameCard";
import OperationalBar from "@/components/OperationalBar";
import SignalCard, { SignalEmptyState } from "@/components/SignalCard";
import SystemStatus from "@/components/SystemStatus";

function buildInfrastructureServices(
  source: "sportmonks" | "mock",
  apiOnline: boolean
): ServiceStatus[] {
  const sportmonksState: ServiceState = apiOnline ? "ONLINE" : "OFFLINE";
  const dataSourceState: ServiceState =
    source === "sportmonks" ? "ONLINE" : "STANDBY";

  return [
    { name: "Sportmonks API", state: sportmonksState },
    { name: "Signal Engine", state: "ACTIVE" },
    {
      name: source === "sportmonks" ? "Data Source · REAL" : "Data Source · MOCK",
      state: dataSourceState,
    },
  ];
}

export default function LiveDashboard() {
  const {
    matches,
    signals,
    status,
    error,
    lastUpdated,
    source,
    responseTime,
  } = useLiveMatches();

  const { signalActivity } = useSystemMetrics();
  const {
    engine,
    dispatchQueueSize,
    loading: engineLoading,
  } = useEngineInsights();

  const displayLatency = responseTime ?? undefined;

  const services = useMemo(
    () =>
      buildInfrastructureServices(
        source,
        source === "sportmonks" && status !== "error"
      ),
    [source, status]
  );

  const showGrid = matches.length > 0;

  return (
    <>
      <Header
        liveCount={matches.length}
        activeSignals={signals.length}
        latencyMs={displayLatency}
        engineStatus={status === "error" ? "DEGRADED" : "ONLINE"}
      />

      <OperationalBar
        trackedCount={matches.length}
        activeSignals={signals.length}
        dataSource={source}
        feedStatus={status}
        apiLatencyMs={displayLatency}
        lastUpdated={lastUpdated ?? undefined}
        signalActivity={signalActivity}
      />

      <EngineTelemetryStrip
        engine={engine}
        loading={engineLoading}
        dispatchQueueSize={dispatchQueueSize}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 xl:gap-7">
        <section className="min-w-0 xl:col-span-7 2xl:col-span-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="section-header">Match Monitoring Grid</h2>
            <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-muted">
              <span
                className={`h-1 w-1 rounded-full animate-live-blink ${
                  source === "sportmonks" ? "bg-pressure" : "bg-amber-400"
                }`}
              />
              {source === "sportmonks" ? "Live Feed" : "Mock Feed"}
            </span>
          </div>
          {showGrid ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {matches.map((match) => {
                const view = toLiveMatchView(match);
                return (
                  <Link
                    key={view.id}
                    href={`/live/${encodeURIComponent(view.id)}`}
                    className="block transition hover:-translate-y-0.5"
                  >
                    <LiveGameCard
                      id={view.id}
                      league={view.league}
                      homeTeam={view.homeTeam}
                      awayTeam={view.awayTeam}
                      minute={view.minute}
                      pressureScore={view.pressureScore}
                      shots={view.shots}
                      dangerousAttacks={view.dangerousAttacks}
                    />
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="module-panel border border-dashed border-card/80 px-6 py-12 text-center">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-muted">
                {status === "loading"
                  ? "Syncing live matches…"
                  : "No in-play matches available"}
              </p>
              {error && (
                <p className="mt-2 font-mono text-[10px] text-amber-400/80">
                  {error}
                </p>
              )}
            </div>
          )}
        </section>

        <aside className="flex min-w-0 flex-col gap-6 xl:col-span-5 2xl:col-span-4">
          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="section-header">Tactical Alerts</h2>
              <span className="border border-pressure/30 bg-pressure/5 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-pressure">
                {signals.length} Validated
              </span>
            </div>
            <div className="module-panel p-3 sm:p-4">
              {signals.length === 0 ? (
                <SignalEmptyState />
              ) : (
                <div className="flex flex-col gap-3">
                  {signals.map((signal) => (
                    <SignalCard
                      key={`${signal.matchId}-${signal.market}`}
                      market={signal.market}
                      match={signal.matchLabel}
                      odd={signal.odd}
                      confidence={signal.confidence}
                      reason={signal.reason}
                      stake={signal.stake}
                      score={signal.pressureScore}
                      isLive
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          <SystemStatus services={services} latencyMs={displayLatency} />
        </aside>
      </div>
    </>
  );
}
