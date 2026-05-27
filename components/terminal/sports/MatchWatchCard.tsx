"use client";

import { useMemo } from "react";
import { Star } from "lucide-react";
import TeamBadge from "@/components/matches/TeamBadge";
import LeagueFlag from "./LeagueFlag";
import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import { leagueLine } from "@/lib/terminal/sportsDisplay";
import {
  buildCardMetricChips,
  buildCardOdds,
  cardStatusLabel,
  cardStatusTone,
  isHighlightMatch,
} from "@/lib/terminal/watchCardDisplay";
import {
  resolveTeamLogo,
  resolveTeamLogoFromEnriched,
} from "@/lib/teams/teamLogoResolver";
import { cn } from "@/lib/utils";

export default function MatchWatchCard({
  match,
  isFavorite,
  featured = false,
  onOpen,
  onToggleFavorite,
}: {
  match: EnrichedLiveMatch;
  isFavorite: boolean;
  featured?: boolean;
  onOpen: () => void;
  onToggleFavorite: () => void;
}) {
  const homeLogo = useMemo(
    () =>
      resolveTeamLogoFromEnriched(match, "home") ??
      resolveTeamLogo({ side: "home", teamName: match.homeTeam, enriched: match }),
    [match]
  );
  const awayLogo = useMemo(
    () =>
      resolveTeamLogoFromEnriched(match, "away") ??
      resolveTeamLogo({ side: "away", teamName: match.awayTeam, enriched: match }),
    [match]
  );

  const tone = cardStatusTone(match);
  const statusLabel = cardStatusLabel(match);
  const highlight = isHighlightMatch(match);
  const metrics = buildCardMetricChips(match);
  const oddsLine = buildCardOdds(match);

  const scoreHome =
    match.scoreKnown && match.homeScore != null ? String(match.homeScore) : null;
  const scoreAway =
    match.scoreKnown && match.awayScore != null ? String(match.awayScore) : null;
  const hasScore = scoreHome != null && scoreAway != null;

  const showFooter = metrics.length > 0 || oddsLine != null;

  return (
    <article
      className={cn(
        "gp-watch__card",
        `gp-watch__card--${tone}`,
        featured && "gp-watch__card--featured",
        highlight && "gp-watch__card--highlight",
        isFavorite && "gp-watch__card--fav"
      )}
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
      {featured ? (
        <span className="gp-watch__card-ribbon">Destaque ao vivo</span>
      ) : null}

      <header className="gp-watch__card-top">
        <div className="gp-watch__league">
          <LeagueFlag league={match.league} />
          <span className="gp-watch__league-name">{leagueLine(match)}</span>
        </div>
        <div className="gp-watch__card-top-right">
          {statusLabel ? (
            <span className={cn("gp-watch__status", `gp-watch__status--${tone}`)}>
              {tone === "live" ? <span className="gp-watch__live-dot" aria-hidden /> : null}
              {statusLabel}
            </span>
          ) : null}
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
      </header>

      <div className="gp-watch__card-center">
        <div className="gp-watch__team gp-watch__team--home">
          <TeamBadge teamName={match.homeTeam} logoUrl={homeLogo} size={featured ? "2xl" : "xl"} />
          <span className="gp-watch__team-name">{match.homeTeam}</span>
        </div>

        <div className="gp-watch__score-block">
          {hasScore ? (
            <span className="gp-watch__score" aria-label="Placar">
              <span>{scoreHome}</span>
              <span className="gp-watch__score-sep">:</span>
              <span>{scoreAway}</span>
            </span>
          ) : (
            <span className="gp-watch__vs">vs</span>
          )}
        </div>

        <div className="gp-watch__team gp-watch__team--away">
          <TeamBadge teamName={match.awayTeam} logoUrl={awayLogo} size={featured ? "2xl" : "xl"} />
          <span className="gp-watch__team-name">{match.awayTeam}</span>
        </div>
      </div>

      {showFooter ? (
        <footer className="gp-watch__card-foot">
          {oddsLine ? (
            <div className="gp-watch__odds-row">
              {oddsLine.home ? (
                <span
                  className={cn(
                    "gp-watch__odd-pill",
                    oddsLine.marketFavorite === "home" && "gp-watch__odd-pill--fav"
                  )}
                >
                  <em>1</em> {oddsLine.home}
                </span>
              ) : null}
              {oddsLine.away ? (
                <span
                  className={cn(
                    "gp-watch__odd-pill",
                    oddsLine.marketFavorite === "away" && "gp-watch__odd-pill--fav"
                  )}
                >
                  <em>2</em> {oddsLine.away}
                </span>
              ) : null}
            </div>
          ) : null}
          {metrics.length > 0 ? (
            <div className="gp-watch__metrics-row">
              {metrics.map((chip) => (
                <span key={chip.id} className="gp-watch__metric-chip">
                  <span className="gp-watch__metric-label">{chip.label}</span>
                  <strong>{chip.value}</strong>
                </span>
              ))}
            </div>
          ) : null}
        </footer>
      ) : null}
    </article>
  );
}
