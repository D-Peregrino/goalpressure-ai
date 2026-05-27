"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import TeamBadge from "@/components/matches/TeamBadge";
import LeagueFlag from "./LeagueFlag";
import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import { leagueLine } from "@/lib/terminal/sportsDisplay";
import { resolveTeamLogoFromEnriched, resolveTeamLogo } from "@/lib/teams/teamLogoResolver";
import type { Match } from "@/types/domain";
import { cn } from "@/lib/utils";

interface DetailResponse {
  ok: boolean;
  match?: Match;
  hasStatistics?: boolean;
  error?: string;
}

function formatKickoff(match: Match | EnrichedLiveMatch): string | null {
  const ts = "startingAtTimestamp" in match ? match.startingAtTimestamp : undefined;
  const at = "startingAt" in match ? match.startingAt : undefined;
  if (ts != null && ts > 0) {
    try {
      return new Intl.DateTimeFormat("pt-BR", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Sao_Paulo",
      }).format(new Date(ts * 1000));
    } catch {
      /* fall through */
    }
  }
  if (at && typeof at === "string") {
    const d = new Date(at);
    if (!Number.isNaN(d.getTime())) {
      return new Intl.DateTimeFormat("pt-BR", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Sao_Paulo",
      }).format(d);
    }
  }
  if ("kickoffLabel" in match && match.kickoffLabel) {
    return match.kickoffLabel;
  }
  return null;
}

function statRow(label: string, home: number | undefined, away: number | undefined) {
  if (home == null && away == null) return null;
  return (
    <div className="gp-match-detail__stat-row" key={label}>
      <span className="gp-match-detail__stat-home">{home ?? "—"}</span>
      <span className="gp-match-detail__stat-label">{label}</span>
      <span className="gp-match-detail__stat-away">{away ?? "—"}</span>
    </div>
  );
}

export default function TerminalMatchDetail({
  match,
  isFavorite,
  onToggleFavorite,
  onClose,
}: {
  match: EnrichedLiveMatch;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(match.isFinished || match.isPreMatch);
  const [detail, setDetail] = useState<Match | null>(null);
  const [hasStatistics, setHasStatistics] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!match.isFinished && !match.isPreMatch) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const res = await fetch(`/api/terminal/match/${match.fixtureId}`, {
          cache: "no-store",
        });
        const body = (await res.json()) as DetailResponse;
        if (cancelled) return;
        if (body.ok && body.match) {
          setDetail(body.match);
          setHasStatistics(Boolean(body.hasStatistics && body.match.teamStats));
        } else {
          setFetchError(body.error ?? "Detalhe indisponível");
        }
      } catch {
        if (!cancelled) setFetchError("Falha ao carregar detalhe da partida");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [match.fixtureId, match.isFinished, match.isPreMatch]);

  const display = detail ?? null;

  const homeTeam = display?.homeTeam ?? match.homeTeam;
  const awayTeam = display?.awayTeam ?? match.awayTeam;
  const league = display?.league ?? match.league;

  const homeLogo = useMemo(() => {
    if (display) {
      return (
        resolveTeamLogo({
          side: "home",
          teamName: homeTeam,
          match: display,
          enriched: match,
        }) ?? resolveTeamLogoFromEnriched(match, "home")
      );
    }
    return resolveTeamLogoFromEnriched(match, "home");
  }, [display, homeTeam, match]);

  const awayLogo = useMemo(() => {
    if (display) {
      return (
        resolveTeamLogo({
          side: "away",
          teamName: awayTeam,
          match: display,
          enriched: match,
        }) ?? resolveTeamLogoFromEnriched(match, "away")
      );
    }
    return resolveTeamLogoFromEnriched(match, "away");
  }, [display, awayTeam, match]);

  const scoreHome =
    display?.score?.home ?? (match.scoreKnown ? match.homeScore : null);
  const scoreAway =
    display?.score?.away ?? (match.scoreKnown ? match.awayScore : null);
  const hasScore = scoreHome != null && scoreAway != null;

  const kickoff = display ? formatKickoff(display) : formatKickoff(match);
  const teamStats = display?.teamStats;

  const statsRows = teamStats
    ? [
        statRow("Finalizações", teamStats.home.shots, teamStats.away.shots),
        statRow(
          "No alvo",
          teamStats.home.shotsOnTarget,
          teamStats.away.shotsOnTarget
        ),
        statRow(
          "Ataques perigosos",
          teamStats.home.dangerousAttacks,
          teamStats.away.dangerousAttacks
        ),
        statRow("Escanteios", teamStats.home.corners, teamStats.away.corners),
        statRow(
          "Posse %",
          teamStats.home.possession,
          teamStats.away.possession
        ),
      ].filter(Boolean)
    : [];

  const statusLabel = match.isFinished
    ? "Encerrado"
    : match.isPreMatch
      ? "Agendado"
      : match.minuteLabel;

  return (
    <div className="gp-match-detail" role="dialog" aria-modal="true" aria-label="Detalhe do jogo">
      <button
        type="button"
        className="gp-match-detail__backdrop"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div className="gp-match-detail__panel">
        <header className="gp-match-detail__header">
          <div className="gp-match-detail__league">
            <LeagueFlag league={league} />
            <span>{leagueLine({ ...match, league })}</span>
          </div>
          <div className="gp-match-detail__header-actions">
            <span
              className={cn(
                "gp-match-detail__status",
                match.isFinished && "gp-match-detail__status--ft",
                match.isLive && "gp-match-detail__status--live"
              )}
            >
              {statusLabel}
            </span>
            <button
              type="button"
              className={cn("gp-match-detail__fav", isFavorite && "gp-match-detail__fav--on")}
              onClick={onToggleFavorite}
              aria-label="Favorito"
            >
              {isFavorite ? "★" : "☆"}
            </button>
            <button type="button" className="gp-match-detail__close" onClick={onClose} aria-label="Fechar">
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {kickoff ? <p className="gp-match-detail__kickoff">{kickoff}</p> : null}

        {loading ? (
          <p className="gp-match-detail__loading">Carregando detalhes…</p>
        ) : (
          <>
            <div className="gp-match-detail__scoreboard">
              <div className="gp-match-detail__team">
                <TeamBadge teamName={homeTeam} logoUrl={homeLogo} size="xl" />
                <span className="gp-match-detail__team-name">{homeTeam}</span>
              </div>
              <div className="gp-match-detail__score-center">
                {hasScore ? (
                  <span className="gp-match-detail__score">
                    {scoreHome}
                    <span className="gp-match-detail__score-sep">:</span>
                    {scoreAway}
                  </span>
                ) : (
                  <span className="gp-match-detail__vs">vs</span>
                )}
                {match.isFinished ? (
                  <span className="gp-match-detail__ft-label">Placar final</span>
                ) : null}
              </div>
              <div className="gp-match-detail__team gp-match-detail__team--away">
                <TeamBadge teamName={awayTeam} logoUrl={awayLogo} size="xl" />
                <span className="gp-match-detail__team-name">{awayTeam}</span>
              </div>
            </div>

            {fetchError ? (
              <p className="gp-match-detail__notice gp-match-detail__notice--warn">{fetchError}</p>
            ) : null}

            <section className="gp-match-detail__stats">
              <h3>Estatísticas</h3>
              {statsRows.length > 0 ? (
                <div className="gp-match-detail__stats-grid">{statsRows}</div>
              ) : (
                <p className="gp-match-detail__notice">
                  Estatísticas detalhadas não disponíveis para esta partida.
                </p>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
