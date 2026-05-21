"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Star } from "lucide-react";
import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import { getTeamColor } from "@/lib/ui/teamColors";
import ScoreBoard from "@/components/matches/ScoreBoard";
import MatchStatusPill from "@/components/matches/MatchStatusPill";
import PressureComparisonBar from "@/components/matches/PressureComparisonBar";
import MiniPressureTimeline from "@/components/matches/MiniPressureTimeline";
import EngineBadges from "@/components/matches/EngineBadges";
import MarketMiniPanel from "@/components/matches/MarketMiniPanel";

const TABS = ["Live", "Odds", "Stats", "Players", "Engines"] as const;
type TabId = (typeof TABS)[number];

const METRICS = [
  { key: "pressureScore", label: "Pressure" },
  { key: "momentum", label: "Momentum" },
  { key: "chaosIndex", label: "Chaos" },
  { key: "edgePercent", label: "Edge" },
  { key: "confidence", label: "Conf." },
  { key: "ev", label: "EV" },
] as const;

export default function LiveMatchCard({
  match,
  isFavorite,
  onToggleFavorite,
  pressureHistory,
}: {
  match: EnrichedLiveMatch;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  pressureHistory?: number[];
}) {
  const [tab, setTab] = useState<TabId>("Live");
  const homeColor = getTeamColor(match.homeTeam);
  const awayColor = getTeamColor(match.awayTeam);
  const isDev = process.env.NODE_ENV === "development";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="match-card"
    >
      <div
        className="h-1 shrink-0 w-full"
        style={{ background: `linear-gradient(90deg, ${homeColor}, ${awayColor})` }}
      />

      <div className="match-card__body">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono-data text-[11px] uppercase tracking-wide text-[var(--muted)]">
              {match.league}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <MatchStatusPill
                status={match.displayStatus}
                minuteLabel={match.minuteLabel}
                pulse={match.displayStatus === "LIVE"}
              />
              {match.matchPhase && (
                <span className="rounded-full border border-[var(--border)] bg-[var(--gp-white-tech)] px-2 py-0.5 font-mono-data text-[10px] text-[var(--muted)]">
                  {match.matchPhase}
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {isDev && match.debug?.scoreMissing && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 font-mono-data text-[9px] text-amber-800">
                score missing
              </span>
            )}
            {isDev && match.debug?.fixtureMissing && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 font-mono-data text-[9px] text-amber-800">
                fixture missing
              </span>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onToggleFavorite();
              }}
              className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-[var(--gp-white-tech)]"
              aria-label={isFavorite ? "Remover favorito" : "Favoritar"}
            >
              <Star
                className={`h-4 w-4 ${isFavorite ? "fill-[#FF2B2B] text-[#FF2B2B]" : "text-[var(--muted)]"}`}
              />
            </button>
            <Link
              href={`/match/${encodeURIComponent(match.fixtureId)}`}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--gp-white-tech)] hover:text-[#FF2B2B]"
              aria-label="Abrir partida"
            >
              <ChevronRight className="h-5 w-5" />
            </Link>
          </div>
        </header>

        <ScoreBoard
          homeTeam={match.homeTeam}
          awayTeam={match.awayTeam}
          homeScore={match.homeScore}
          awayScore={match.awayScore}
          scoreKnown={match.scoreKnown}
          homeLogo={match.homeLogo}
          awayLogo={match.awayLogo}
        />

        <div className="match-card__metrics-row">
          {METRICS.map(({ key, label }) => {
            const raw = match[key as keyof EnrichedLiveMatch];
            let display: string;
            if (key === "edgePercent") {
              display = raw != null ? `${Number(raw).toFixed(1)}%` : "—";
            } else if (key === "ev") {
              display = raw != null ? `${(Number(raw) * 100).toFixed(1)}%` : "—";
            } else {
              display = raw != null ? String(Math.round(Number(raw))) : "—";
            }
            const accent = key === "pressureScore" || key === "ev";
            return (
              <div key={key} className="match-card__metric-chip">
                <p className="text-[9px] uppercase tracking-wide text-[var(--muted)]">{label}</p>
                <p
                  className={`mt-1 text-sm font-semibold tabular-nums ${accent ? "text-[#FF2B2B]" : "text-[var(--text)]"}`}
                >
                  {display}
                </p>
              </div>
            );
          })}
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

        {match.recentEvents.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {match.recentEvents.map((ev) => (
              <span
                key={ev}
                className="rounded-full border border-[var(--border)] px-2.5 py-0.5 font-mono-data text-[10px] text-[var(--muted)]"
              >
                {ev}
              </span>
            ))}
          </div>
        )}

        <div className="mt-3">
          <EngineBadges
            executionDecision={match.executionDecision}
            executionGrade={match.executionGrade}
            chaosIndex={match.chaosIndex}
            microeventBadges={match.microeventBadges}
            sequenceState={match.sequenceState}
          />
        </div>

        <footer className="mt-auto pt-4">
          <div className="match-card__tabs">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`shrink-0 rounded-lg px-3 py-1.5 font-mono-data text-[10px] font-semibold uppercase tracking-wide transition-colors ${
                  tab === t
                    ? "bg-[var(--card-dark)] text-[var(--text-on-dark)]"
                    : "text-[var(--muted)] hover:bg-[var(--gp-white-tech)]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="mt-3 min-h-[64px] font-mono-data text-[11px] text-[var(--muted)]">
            {tab === "Live" && (
              <p>
                Pressão {Math.round(match.pressureScore)} · Janela {match.triggerWindow ?? "—"} ·{" "}
                {match.sequenceState ?? "—"}
              </p>
            )}
            {tab === "Odds" && (
              <MarketMiniPanel markets={match.markets} primaryOdd={match.odds.primary} />
            )}
            {tab === "Stats" && (
              <p>
                Chaos {Math.round(match.chaosIndex)} · Momentum {Math.round(match.momentum)} · Conf.{" "}
                {Math.round(match.confidence)}
              </p>
            )}
            {tab === "Players" && <p>Player impact · runtime em consolidação</p>}
            {tab === "Engines" && (
              <p>
                {match.executionDecision ?? "WATCH"} · Grade {match.executionGrade ?? "—"}
              </p>
            )}
          </div>
        </footer>
      </div>
    </motion.article>
  );
}
