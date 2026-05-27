"use client";

import { useMemo } from "react";
import { Star } from "lucide-react";
import TeamBadge from "@/components/matches/TeamBadge";
import LeagueFlag from "./LeagueFlag";
import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import { leagueLine } from "@/lib/terminal/sportsDisplay";
import { resolveTeamLogoFromEnriched } from "@/lib/teams/teamLogoResolver";
import { cn } from "@/lib/utils";

function matchStatus(match: EnrichedLiveMatch): {
  label: string;
  variant: "live" | "scheduled" | "finished" | "default";
} {
  if (match.isLive) {
    return { label: match.minuteLabel || "Ao vivo", variant: "live" };
  }
  if (match.isPreMatch) {
    return {
      label: match.kickoffLabel ? `Hoje ${match.kickoffLabel}` : "Agendado",
      variant: "scheduled",
    };
  }
  if (match.isFinished) {
    return { label: "Encerrado", variant: "finished" };
  }
  return { label: match.minuteLabel || "—", variant: "default" };
}

function formatOdd(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  return value.toFixed(2);
}

export default function MatchWatchCard({
  match,
  isFavorite,
  onOpen,
  onToggleFavorite,
}: {
  match: EnrichedLiveMatch;
  isFavorite: boolean;
  onOpen: () => void;
  onToggleFavorite: () => void;
}) {
  const homeLogo = useMemo(() => resolveTeamLogoFromEnriched(match, "home"), [match]);
  const awayLogo = useMemo(() => resolveTeamLogoFromEnriched(match, "away"), [match]);
  const status = matchStatus(match);

  const scoreHome =
    match.scoreKnown && match.homeScore != null ? String(match.homeScore) : null;
  const scoreAway =
    match.scoreKnown && match.awayScore != null ? String(match.awayScore) : null;
  const hasScore = scoreHome != null && scoreAway != null;

  const mainOdd =
    formatOdd(match.odds.primary) ??
    formatOdd(match.odds.over15) ??
    formatOdd(match.odds.fullTimeResult);

  const showPressure =
    match.isLive && match.pressureScore > 0 && Number.isFinite(match.pressureScore);

  return (
    <article
      className={cn("gp-watch__card", match.isLive && "gp-watch__card--live")}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="gp-watch__card-head">
        <div className="gp-watch__league">
          <LeagueFlag league={match.league} />
          <span className="gp-watch__league-name">{leagueLine(match)}</span>
        </div>
        <div className="gp-watch__card-actions">
          <span
            className={cn(
              "gp-watch__status",
              status.variant === "live" && "gp-watch__status--live",
              status.variant === "scheduled" && "gp-watch__status--scheduled",
              status.variant === "finished" && "gp-watch__status--finished"
            )}
          >
            {status.variant === "live" ? (
              <span className="gp-watch__live-dot" aria-hidden />
            ) : null}
            {status.label}
          </span>
          <button
            type="button"
            className={cn("gp-watch__fav", isFavorite && "gp-watch__fav--on")}
            aria-label={isFavorite ? "Remover favorito" : "Favoritar"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
          >
            <Star className="h-4 w-4" strokeWidth={2} fill={isFavorite ? "currentColor" : "none"} />
          </button>
        </div>
      </div>

      <div className="gp-watch__matchup">
        <div className="gp-watch__team gp-watch__team--home">
          <TeamBadge teamName={match.homeTeam} logoUrl={homeLogo} size="lg" />
          <span className="gp-watch__team-name">{match.homeTeam}</span>
        </div>

        <div className="gp-watch__score-block">
          {hasScore ? (
            <span className="gp-watch__score" aria-label="Placar">
              <span>{scoreHome}</span>
              <span className="gp-watch__score-sep">:</span>
              <span>{scoreAway}</span>
            </span>
          ) : match.isPreMatch ? (
            <span className="gp-watch__vs">vs</span>
          ) : (
            <span className="gp-watch__vs">—</span>
          )}
          {mainOdd ? <span className="gp-watch__odd">{mainOdd}</span> : null}
        </div>

        <div className="gp-watch__team gp-watch__team--away">
          <TeamBadge teamName={match.awayTeam} logoUrl={awayLogo} size="lg" />
          <span className="gp-watch__team-name">{match.awayTeam}</span>
        </div>
      </div>

      {showPressure || (match.isLive && match.cardInsight) ? (
        <footer className="gp-watch__card-foot">
          {showPressure ? (
            <span className="gp-watch__gpi" title="Pressão ofensiva">
              Pressão <strong>{Math.round(match.pressureScore)}</strong>
            </span>
          ) : null}
          {match.isLive && match.cardInsight ? (
            <span className="gp-watch__insight">{match.displayInsight || match.cardInsight}</span>
          ) : null}
        </footer>
      ) : null}
    </article>
  );
}
