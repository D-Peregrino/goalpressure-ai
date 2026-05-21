"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, TrendingUp } from "lucide-react";
import { useMatchIntel } from "@/hooks/useMatchIntel";
import ExecutionBadge from "@/components/ui/ExecutionBadge";
import GaugeArc from "@/components/ui/GaugeArc";
import ChaosRadar from "@/components/ui/ChaosRadar";
import ExecutionBar from "@/components/ui/ExecutionBar";
import { fadeUp, staggerContainer } from "@/components/ui/motion";
import type { ExecutionGrade } from "@/lib/design/tokens";

export default function MatchIntelView({ matchId }: { matchId: string }) {
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
    lastUpdated,
  } = useMatchIntel(matchId);

  const grade =
    meta && "executionGrade" in meta
      ? (meta.executionGrade as ExecutionGrade)
      : pressure && pressure.pressureScore >= 75
        ? "A"
        : "B";

  const chaos =
    sequence?.sustainedChaosLevel ??
    temporal?.chaosIndex ??
    microevent?.microeventScore ??
    40;

  if (!match && feedStatus === "loading") {
    return (
      <p className="font-mono text-sm text-muted">Loading match intelligence…</p>
    );
  }

  if (!match) {
    return (
      <div className="gp-card p-8 text-center">
        <p className="font-mono text-sm text-muted">Match not in live feed</p>
        <Link href="/terminal" className="gp-btn-ghost mt-6 inline-flex">
          <ArrowLeft className="h-4 w-4" /> Back to feed
        </Link>
      </div>
    );
  }

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show">
      <motion.div variants={fadeUp}>
        <Link
          href="/ops"
          className="gp-label mb-6 inline-flex items-center gap-2 hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Command Center
        </Link>
      </motion.div>

      <motion.header variants={fadeUp} className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="gp-label">{match.league}</p>
          <h1 className="mt-2 font-sans text-3xl font-semibold tracking-tight sm:text-4xl">
            {match.homeTeam}
            <span className="text-muted font-normal"> vs </span>
            {match.awayTeam}
          </h1>
          <p className="mt-3 flex items-center gap-3 font-mono text-[11px] text-muted">
            <Clock className="h-3 w-3" />
            {match.minute}&apos; live · {feedStatus}
            {lastUpdated && ` · ${new Date(lastUpdated).toLocaleTimeString()}`}
          </p>
        </div>
        <ExecutionBadge grade={grade} size="lg" />
      </motion.header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
        {[
          { label: "Pressure", value: pressure?.pressureScore ?? match.pressure.score, color: "#ff2b2b" },
          { label: "Momentum", value: pressure?.momentum ?? 0, color: "#3ee8ff" },
          { label: "Goal prob.", value: pressure?.goalProbability ?? 0, color: "#34d399" },
          { label: "Confidence", value: pressure?.confidence ?? 0, color: "#a78bfa" },
        ].map((m) => (
          <motion.div key={m.label} variants={fadeUp} className="gp-card p-4 text-center">
            <GaugeArc value={m.value} label={m.label} color={m.color} />
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <motion.div variants={fadeUp} className="lg:col-span-4 gp-card p-6">
          <p className="gp-label mb-4">Chaos · Sequence memory</p>
          <ChaosRadar level={chaos} />
          {sequence && (
            <p className="mt-4 text-center font-mono text-[10px] text-muted">
              State {sequence.sequenceState} · recurrence{" "}
              {sequence.sustainedChaosLevel}
            </p>
          )}
        </motion.div>

        <motion.div variants={fadeUp} className="lg:col-span-5 gp-card p-6">
          <p className="gp-label mb-4">Timeline · Temporal dynamics</p>
          <div className="space-y-4">
            <ExecutionBar
              value={temporal?.chaosIndex ?? 50}
              label={`Phase ${temporal?.matchPhase ?? "—"}`}
              color="#a78bfa"
            />
            <ExecutionBar
              value={microevent?.microeventScore ?? 30}
              label="Microevent intensity"
            />
            <ExecutionBar
              value={
                meta && "consensusScore" in meta ? meta.consensusScore : 50
              }
              label="Meta consensus"
              color="#3ee8ff"
            />
          </div>
          {activeSignal && (
            <div className="mt-6 rounded-lg border border-pressure/25 bg-pressure/5 p-4">
              <p className="gp-label text-pressure">Active signal</p>
              <p className="mt-2 font-mono text-sm">
                {activeSignal.market} · EV {(activeSignal.ev * 100).toFixed(1)}%
              </p>
            </div>
          )}
        </motion.div>

        <motion.div variants={fadeUp} className="lg:col-span-3 space-y-4">
          <div className="gp-card p-5">
            <p className="gp-label mb-3">Market edge</p>
            {edges.length === 0 ? (
              <p className="text-[11px] text-muted">No edge calibrated</p>
            ) : (
              edges.map((e) => (
                <div key={e.market} className="mb-3">
                  <p className="font-mono text-[11px]">{e.market}</p>
                  <ExecutionBar value={e.edgePercent * 8} label={e.classification} />
                </div>
              ))
            )}
          </div>
          <div className="gp-card p-5">
            <p className="gp-label mb-3">Player impact</p>
            <p className="font-mono text-[11px] text-muted">
              GK resistance{" "}
              {playerGk ? Math.round(playerGk.value) : "—"}
            </p>
          </div>
        </motion.div>
      </div>

      <motion.div variants={fadeUp} className="mt-6 gp-card p-6">
        <p className="gp-label mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" /> Pressure timeline
        </p>
        <div className="flex h-24 items-end gap-1">
          {Array.from({ length: 24 }, (_, i) => {
            const h = 20 + Math.sin(i * 0.5) * 30 + (match.pressure.score / 100) * 40;
            return (
              <div
                key={i}
                className="flex-1 rounded-t-sm bg-gradient-to-t from-pressure/20 to-pressure/80"
                style={{ height: `${h}%` }}
              />
            );
          })}
        </div>
        <p className="mt-2 font-mono text-[9px] text-muted">
          Synthetic visualization · live tick history via engine (UI layer)
        </p>
      </motion.div>
    </motion.div>
  );
}
