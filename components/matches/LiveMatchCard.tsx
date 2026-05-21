"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Star } from "lucide-react";
import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import { formatMinute, formatScore } from "@/lib/ui/matchFormatting";
import { getTeamColor } from "@/lib/ui/teamColors";
import ScoreBoard from "@/components/matches/ScoreBoard";
import MatchStatusPill from "@/components/matches/MatchStatusPill";
import PressureComparisonBar from "@/components/matches/PressureComparisonBar";
import MiniPressureTimeline from "@/components/matches/MiniPressureTimeline";
import EngineBadges from "@/components/matches/EngineBadges";
import MarketMiniPanel from "@/components/matches/MarketMiniPanel";

const TABS = ["Live", "Odds", "Stats", "Players", "Engines"] as const;
type TabId = (typeof TABS)[number];

export default function LiveMatchCard({
  match,
  isFavorite,
  onToggleFavorite,
  pressureHistory,
  listMode,
}: {
  match: EnrichedLiveMatch;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  pressureHistory?: number[];
  listMode?: boolean;
}) {
  const [tab, setTab] = useState<TabId>("Live");
  const score = formatScore(
    match.homeScore != null && match.awayScore != null
      ? { home: match.homeScore, away: match.awayScore }
      : null
  );
  const minuteLabel = formatMinute(match.minute, match.status);
  const homeColor = getTeamColor(match.homeTeam);
  const awayColor = getTeamColor(match.awayTeam);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`match-card overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_2px_12px_rgba(32,38,46,0.06)] ${
        listMode ? "flex flex-col sm:flex-row" : ""
      }`}
    >
      <div
        className="h-1 w-full shrink-0"
        style={{
          background: `linear-gradient(90deg, ${homeColor} 0%, ${awayColor} 100%)`,
        }}
      />

      <div className={`flex min-w-0 flex-1 flex-col p-4 sm:p-5 ${listMode ? "sm:pr-6" : ""}`}>
        <header className="mb-4 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-mono-data text-[11px] uppercase tracking-wide text-[var(--muted)]">
              {match.league}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <MatchStatusPill
                status={match.displayStatus}
                minuteLabel={minuteLabel}
                pulse={match.displayStatus === "LIVE"}
              />
              {match.matchPhase && (
                <span className="rounded-md bg-[var(--gp-white-tech)] px-2 py-0.5 font-mono-data text-[10px] text-[var(--muted)]">
                  {match.matchPhase}
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onToggleFavorite();
              }}
              className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--gp-white-tech)]"
              aria-label={isFavorite ? "Remover favorito" : "Favoritar"}
            >
              <Star
                className={`h-4 w-4 ${isFavorite ? "fill-[#FF2B2B] text-[#FF2B2B]" : ""}`}
              />
            </button>
            <Link
              href={`/match/${encodeURIComponent(match.fixtureId)}`}
              className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--gp-white-tech)] hover:text-[#FF2B2B]"
              aria-label="Abrir partida"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </header>

        <ScoreBoard
          homeTeam={match.homeTeam}
          awayTeam={match.awayTeam}
          homeScore={score.home}
          awayScore={score.away}
          compact={listMode}
        />

        <div className="mt-4 grid grid-cols-3 gap-2 font-mono-data text-center text-[11px] sm:grid-cols-6">
          {[
            { l: "Pressure", v: Math.round(match.pressureScore), accent: true },
            { l: "Momentum", v: Math.round(match.momentum) },
            { l: "Chaos", v: Math.round(match.chaosIndex) },
            { l: "Edge", v: match.edgePercent != null ? `${match.edgePercent.toFixed(1)}%` : "—" },
            { l: "Conf.", v: Math.round(match.confidence) },
            {
              l: "EV",
              v: match.ev != null ? `${(match.ev * 100).toFixed(1)}%` : "—",
              accent: true,
            },
          ].map((m) => (
            <div key={m.l} className="rounded-lg bg-[var(--gp-white-tech)] px-1 py-2">
              <p className="text-[9px] uppercase text-[var(--muted)]">{m.l}</p>
              <p className={`mt-0.5 font-semibold tabular-nums ${m.accent ? "text-[#FF2B2B]" : ""}`}>
                {m.v}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <PressureComparisonBar
            homeTeam={match.homeTeam}
            awayTeam={match.awayTeam}
            homePressure={match.homePressure}
            awayPressure={match.awayPressure}
            dominantSide={match.dominantSide}
          />
        </div>

        <div className="mt-3">
          <MiniPressureTimeline
            points={pressureHistory}
            teamName={
              match.dominantSide === "home"
                ? match.homeTeam
                : match.dominantSide === "away"
                  ? match.awayTeam
                  : undefined
            }
            collecting={match.displayStatus === "LIVE" && !pressureHistory?.length}
          />
        </div>

        {match.recentEvents.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {match.recentEvents.map((ev) => (
              <span
                key={ev}
                className="rounded-full border border-[var(--border)] px-2 py-0.5 font-mono-data text-[10px] text-[var(--muted)]"
              >
                {ev}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4">
          <EngineBadges
            executionDecision={match.executionDecision}
            executionGrade={match.executionGrade}
            chaosIndex={match.chaosIndex}
            microeventBadges={match.microeventBadges}
            sequenceState={match.sequenceState}
          />
        </div>

        <footer className="mt-4 border-t border-[var(--border)] pt-3">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`shrink-0 rounded-md px-2.5 py-1 font-mono-data text-[10px] font-medium uppercase tracking-wide ${
                  tab === t
                    ? "bg-[var(--card-dark)] text-[var(--text-on-dark)]"
                    : "text-[var(--muted)] hover:bg-[var(--gp-white-tech)]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="mt-3 min-h-[72px]">
            {tab === "Live" && (
              <div className="space-y-2 font-mono-data text-[11px] text-[var(--muted)]">
                <p>
                  Pressão total <span className="font-semibold text-[#FF2B2B]">{Math.round(match.pressureScore)}</span>
                  {" · "}
                  Janela {match.triggerWindow ?? "—"}
                </p>
                <p>Estado {match.sequenceState ?? "—"}</p>
              </div>
            )}
            {tab === "Odds" && (
              <MarketMiniPanel markets={match.markets} primaryOdd={match.odds.primary} />
            )}
            {tab === "Stats" && (
              <div className="grid grid-cols-2 gap-2 font-mono-data text-[11px]">
                <div>
                  <span className="text-[var(--muted)]">Chaos</span>
                  <p className="font-semibold">{Math.round(match.chaosIndex)}</p>
                </div>
                <div>
                  <span className="text-[var(--muted)]">Momentum</span>
                  <p className="font-semibold">{Math.round(match.momentum)}</p>
                </div>
              </div>
            )}
            {tab === "Players" && (
              <p className="font-mono-data text-[11px] text-[var(--muted)]">
                Impacto de elenco · dados em consolidação via player runtime
              </p>
            )}
            {tab === "Engines" && (
              <div className="font-mono-data text-[11px] text-[var(--muted)] space-y-1">
                <p>Meta consensus · {match.executionDecision ?? "WATCH"}</p>
                <p>Grade {match.executionGrade ?? "—"}</p>
              </div>
            )}
          </div>
        </footer>
      </div>
    </motion.article>
  );
}
