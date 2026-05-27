"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import TeamBadge from "@/components/matches/TeamBadge";
import LeagueFlag from "./LeagueFlag";
import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import { leagueLine } from "@/lib/terminal/sportsDisplay";
import { buildCardOdds } from "@/lib/terminal/watchCardDisplay";
import {
  resolveTeamLogo,
  resolveTeamLogoFromEnriched,
} from "@/lib/teams/teamLogoResolver";
import type { Match, TimelineEventSummary } from "@/types/domain";
import type { TerminalTimelineEvent } from "@/lib/terminal/parseTerminalMatchTimeline";
import { terminalEventLabel } from "@/lib/terminal/terminalEventLabel";
import type { ValidatedTeamStats } from "@/lib/terminal/validatedStats";
import { cn } from "@/lib/utils";

interface DetailResponse {
  ok: boolean;
  match?: Match;
  hasStatistics?: boolean;
  hasEvents?: boolean;
  standingsAvailable?: boolean;
  venue?: string | null;
  eventsCount?: number;
  timelineEvents?: TerminalTimelineEvent[];
  validatedTeamStats?: ValidatedTeamStats | null;
  error?: string;
}

function fallbackTimelineLines(
  events: TimelineEventSummary[],
  homeTeam: string,
  awayTeam: string
): { key: string; displayLine: string }[] {
  return [...events]
    .sort((a, b) => a.minute - b.minute)
    .map((ev, i) => {
      const label = terminalEventLabel(ev.type);
      const team =
        ev.side === "home" ? homeTeam : ev.side === "away" ? awayTeam : null;
      const head = `${ev.minute}' ${label}`;
      const displayLine = team ? `${head} — ${team}` : head;
      return { key: `${ev.minute}-${i}`, displayLine };
    });
}

function formatKickoff(match: Match | EnrichedLiveMatch): string | null {
  const ts =
    "startingAtTimestamp" in match && match.startingAtTimestamp != null
      ? match.startingAtTimestamp
      : undefined;
  const at = "startingAt" in match ? match.startingAt : undefined;
  if (ts != null && ts > 0) {
    try {
      return new Intl.DateTimeFormat("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
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
        weekday: "long",
        day: "2-digit",
        month: "long",
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

function statRow(
  label: string,
  home: number | undefined,
  away: number | undefined
): ReactNode | null {
  if (home == null && away == null) return null;
  if ((home ?? 0) <= 0 && (away ?? 0) <= 0) return null;
  return (
    <div className="gp-match-detail__stat-row">
      <span className="gp-match-detail__stat-home">{home ?? 0}</span>
      <span className="gp-match-detail__stat-label">{label}</span>
      <span className="gp-match-detail__stat-away">{away ?? 0}</span>
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
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Match | null>(null);
  const [meta, setMeta] = useState<{
    venue: string | null;
    standingsAvailable: boolean;
    hasEvents: boolean;
  }>({ venue: null, standingsAvailable: false, hasEvents: false });
  const [timelineEvents, setTimelineEvents] = useState<TerminalTimelineEvent[]>([]);
  const [validatedTeamStats, setValidatedTeamStats] =
    useState<ValidatedTeamStats | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setFetchError(null);
      setTimelineEvents([]);
      setValidatedTeamStats(null);
      try {
        const res = await fetch(`/api/terminal/match/${match.fixtureId}`, {
          cache: "no-store",
        });
        const body = (await res.json()) as DetailResponse;
        if (cancelled) return;
        if (body.ok && body.match) {
          setDetail(body.match);
          setTimelineEvents(body.timelineEvents ?? []);
          setValidatedTeamStats(body.validatedTeamStats ?? null);
          setMeta({
            venue: body.venue ?? null,
            standingsAvailable: Boolean(body.standingsAvailable),
            hasEvents: Boolean(body.hasEvents),
          });
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
  }, [match.fixtureId]);

  const display = detail;
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
  const statsRows = validatedTeamStats
    ? [
        statRow("Finalizações", validatedTeamStats.home.shots, validatedTeamStats.away.shots),
        statRow("No alvo", validatedTeamStats.home.shotsOnTarget, validatedTeamStats.away.shotsOnTarget),
        statRow(
          "Ataques perigosos",
          validatedTeamStats.home.dangerousAttacks,
          validatedTeamStats.away.dangerousAttacks
        ),
        statRow("Escanteios", validatedTeamStats.home.corners, validatedTeamStats.away.corners),
        statRow("Posse %", validatedTeamStats.home.possession, validatedTeamStats.away.possession),
        statRow(
          "Cartões amarelos",
          validatedTeamStats.home.yellowCards,
          validatedTeamStats.away.yellowCards
        ),
        statRow(
          "Cartões vermelhos",
          validatedTeamStats.home.redCards,
          validatedTeamStats.away.redCards
        ),
      ].filter(Boolean)
    : [];

  const oddsForModal = useMemo(() => {
    const enrichedOdds = match.odds;
    const m = display ?? match;
    const merged: EnrichedLiveMatch = {
      ...match,
      odds: display?.odds ?? enrichedOdds,
      homeTeam: m.homeTeam ?? match.homeTeam,
      awayTeam: m.awayTeam ?? match.awayTeam,
    };
    return buildCardOdds(merged);
  }, [display, match]);

  const fallbackTimeline = useMemo(
    () =>
      fallbackTimelineLines(
        display?.premium?.timelineEvents ?? match.sportmonksTimeline ?? [],
        homeTeam,
        awayTeam
      ),
    [display?.premium?.timelineEvents, match.sportmonksTimeline, homeTeam, awayTeam]
  );

  const statusLabel = match.isFinished
    ? "Encerrado"
    : match.isPreMatch
      ? "Agendado"
      : match.isLive
        ? match.minuteLabel || "Ao vivo"
        : match.minuteLabel;

  const tone = match.isLive ? "live" : match.isFinished ? "finished" : "scheduled";

  return (
    <div className="gp-match-detail" role="dialog" aria-modal="true" aria-label="Detalhe do jogo">
      <button type="button" className="gp-match-detail__backdrop" aria-label="Fechar" onClick={onClose} />
      <div className="gp-match-detail__panel">
        <header className="gp-match-detail__header">
          <div className="gp-match-detail__league">
            <LeagueFlag league={league} />
            <span>{leagueLine({ ...match, league })}</span>
          </div>
          <div className="gp-match-detail__header-actions">
            <span className={cn("gp-match-detail__status", `gp-match-detail__status--${tone}`)}>
              {match.isLive ? <span className="gp-watch__live-dot" aria-hidden /> : null}
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
        {meta.venue ? <p className="gp-match-detail__venue">{meta.venue}</p> : null}

        {loading ? (
          <p className="gp-match-detail__loading">Carregando detalhes…</p>
        ) : (
          <>
            <div className="gp-match-detail__scoreboard">
              <div className="gp-match-detail__team">
                <TeamBadge teamName={homeTeam} logoUrl={homeLogo} size="2xl" />
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
              </div>
              <div className="gp-match-detail__team gp-match-detail__team--away">
                <TeamBadge teamName={awayTeam} logoUrl={awayLogo} size="2xl" />
                <span className="gp-match-detail__team-name">{awayTeam}</span>
              </div>
            </div>

            {fetchError ? (
              <p className="gp-match-detail__notice gp-match-detail__notice--warn">{fetchError}</p>
            ) : null}

            {oddsForModal ? (
              <section className="gp-match-detail__block">
                <h3>Cotações</h3>
                <div className="gp-watch__odds-row gp-match-detail__odds">
                  {oddsForModal.home ? (
                    <span className="gp-watch__odd-pill">
                      <em>1</em> {oddsForModal.home}
                    </span>
                  ) : null}
                  {oddsForModal.away ? (
                    <span className="gp-watch__odd-pill">
                      <em>2</em> {oddsForModal.away}
                    </span>
                  ) : null}
                </div>
              </section>
            ) : null}

            {meta.standingsAvailable ? (
              <p className="gp-match-detail__notice">
                Classificação disponível no feed SportMonks para esta competição.
              </p>
            ) : null}

            <section className="gp-match-detail__block">
              <h3>Estatísticas</h3>
              {statsRows.length > 0 ? (
                <div className="gp-match-detail__stats-grid">{statsRows}</div>
              ) : (
                <p className="gp-match-detail__notice">
                  Estatísticas detalhadas não disponíveis ou ainda não validadas para esta
                  partida.
                </p>
              )}
            </section>

            <section className="gp-match-detail__block">
              <h3>Linha do tempo</h3>
              {timelineEvents.length > 0 ? (
                <ul className="gp-match-detail__events">
                  {timelineEvents.map((ev) => (
                    <li key={`${ev.sortKey}-${ev.displayLine}`}>
                      <span className="gp-match-detail__ev-line">{ev.displayLine}</span>
                    </li>
                  ))}
                </ul>
              ) : fallbackTimeline.length > 0 ? (
                <ul className="gp-match-detail__events">
                  {fallbackTimeline.map((ev) => (
                    <li key={ev.key}>
                      <span className="gp-match-detail__ev-line">{ev.displayLine}</span>
                    </li>
                  ))}
                </ul>
              ) : meta.hasEvents ? (
                <p className="gp-match-detail__notice">
                  Eventos registrados — detalhe por minuto indisponível neste feed.
                </p>
              ) : (
                <p className="gp-match-detail__notice">
                  Linha do tempo não disponível para esta partida.
                </p>
              )}
            </section>

            {match.isLive && match.pressureScore > 0 ? (
              <p className="gp-match-detail__pressure">
                Pressão ofensiva atual: <strong>{Math.round(match.pressureScore)}</strong>
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
