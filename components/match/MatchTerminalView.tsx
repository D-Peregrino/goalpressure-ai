"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useMatchIntel } from "@/hooks/useMatchIntel";
import {
  TerminalCard,
  ExecutionBadge,
  RadarPanel,
  PressureGauge,
  EdgeMeter,
  GlowPanel,
} from "@/components/ui/terminal";
import { terminalFadeUp, terminalStagger } from "@/components/ui/terminal/motion";
import type { ExecutionDecisionUi } from "@/components/ui/terminal/ExecutionBadge";

export default function MatchTerminalView({ fixtureId }: { fixtureId: string }) {
  const {
    match,
    pressure,
    meta,
    temporal,
    microevent,
    sequence,
    playerGk,
    edges,
    activeSignal,
    feedStatus,
  } = useMatchIntel(fixtureId);

  const decision = (meta?.executionDecision ?? "WATCH") as ExecutionDecisionUi;
  const chaos =
    sequence?.sustainedChaosLevel ??
    temporal?.chaosIndex ??
    microevent?.microeventScore ??
    0;

  if (!match && feedStatus === "loading") {
    return <p className="font-body text-sm t-muted">Carregando leitura contextual…</p>;
  }

  if (!match) {
    return (
      <TerminalCard>
        <p className="font-mono-data text-[var(--text-muted-on-dark)]">Partida fora do feed live</p>
        <Link href="/terminal" className="t-btn-secondary mt-6 inline-flex">
          <ArrowLeft className="h-4 w-4" /> Command Center
        </Link>
      </TerminalCard>
    );
  }

  const score = match.score;

  return (
    <motion.div variants={terminalStagger} initial="hidden" animate="show">
      <Link
        href="/terminal"
        className="t-label mb-8 inline-flex items-center gap-2 hover:text-[var(--text)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Live Command Center
      </Link>

      <motion.header variants={terminalFadeUp} className="mb-10 flex flex-wrap justify-between gap-6">
        <div>
          <p className="t-label">{match.league}</p>
          <h1 className="t-page-title mt-2">
            {match.homeTeam}{" "}
            <span className="font-normal t-muted">vs</span> {match.awayTeam}
          </h1>
          <p className="mt-3 font-mono-data t-muted">
            {match.minute}&apos; · Placar {score ? `${score.home}-${score.away}` : "—"}
          </p>
        </div>
        <ExecutionBadge decision={decision} size="lg" />
      </motion.header>

      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { l: "Pressure score", v: pressure?.pressureScore ?? match.pressure.score },
          { l: "Momentum", v: pressure?.momentum ?? 0 },
          { l: "Chaos index", v: chaos },
          { l: "Confiança", v: meta?.institutionalConfidence ?? pressure?.confidence ?? 0 },
        ].map((m) => (
          <TerminalCard key={m.l} className="text-center">
            <p className="t-label">{m.l}</p>
            <p className="mt-2 font-display text-3xl t-accent">{Math.round(m.v)}</p>
          </TerminalCard>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-5">
          <GlowPanel title="Radar · Pressão">
            <RadarPanel value={pressure?.pressureScore ?? match.pressure.score} label="" />
          </GlowPanel>
          <TerminalCard>
            <p className="t-label mb-4">Pressão home / away</p>
            <PressureGauge
              home={pressure?.homePressure ?? match.pressure.score * 0.5}
              away={pressure?.awayPressure ?? match.pressure.score * 0.5}
              total={pressure?.pressureScore ?? match.pressure.score}
            />
          </TerminalCard>
        </div>

        <div className="lg:col-span-4">
          <TerminalCard>
            <p className="t-label mb-5">Timeline · Fase temporal</p>
            <div className="relative mb-8 h-2 rounded-full bg-white/[0.08]">
              <div
                className="absolute top-0 h-2 rounded-full bg-[#FF2B2B]/80"
                style={{ width: `${Math.min(100, match.minute)}%` }}
              />
              <span
                className="absolute -top-1 h-4 w-4 rounded-full border-2 border-[var(--card-dark)] bg-[#FF2B2B]"
                style={{ left: `${Math.min(98, match.minute)}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 font-mono-data">
              <div>
                <p className="t-label">Temporal phase</p>
                <p className="mt-1 font-medium">{temporal?.matchPhase ?? "—"}</p>
              </div>
              <div>
                <p className="t-label">Sequence state</p>
                <p className="mt-1 font-medium">{sequence?.sequenceState ?? "—"}</p>
              </div>
              <div>
                <p className="t-label">Microevent</p>
                <p className="mt-1 font-medium">{Math.round(microevent?.microeventScore ?? 0)}</p>
              </div>
              <div>
                <p className="t-label">Player impact</p>
                <p className="mt-1 font-medium">GK {Math.round(playerGk?.value ?? 0)}</p>
              </div>
            </div>
          </TerminalCard>
        </div>

        <div className="space-y-6 lg:col-span-3">
          <TerminalCard>
            <p className="t-label mb-4">Market edge</p>
            {edges.length === 0 ? (
              <p className="font-mono-data text-[var(--text-muted-on-dark)]">Awaiting live data</p>
            ) : (
              edges.map((e) => (
                <div key={e.market} className="mb-4">
                  <EdgeMeter value={e.edgePercent} label={e.market} />
                  <p className="mt-1 font-mono-data text-xs text-[var(--text-muted-on-dark)]">
                    EV {(e.expectedValue * 100).toFixed(1)}%
                  </p>
                </div>
              ))
            )}
          </TerminalCard>
          {activeSignal && (
            <TerminalCard glow>
              <p className="t-label t-accent">Sinal ativo</p>
              <p className="mt-2 font-mono-data text-sm font-medium">{activeSignal.market}</p>
              <p className="mt-1 font-mono-data text-xs text-[var(--text-muted-on-dark)]">
                EV {(activeSignal.ev * 100).toFixed(1)}%
              </p>
            </TerminalCard>
          )}
        </div>
      </div>

      <TerminalCard className="mt-6">
        <p className="t-label mb-4">Heatmap de pressão (últimos ticks)</p>
        <div className="flex h-24 items-end gap-0.5">
          {Array.from({ length: 36 }, (_, i) => {
            const h = 25 + Math.sin(i * 0.4) * 35 + (match.pressure.score / 100) * 30;
            return (
              <div
                key={i}
                className="flex-1 rounded-t-sm bg-[#FF2B2B]/40"
                style={{ height: `${h}%` }}
              />
            );
          })}
        </div>
      </TerminalCard>
    </motion.div>
  );
}
