"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import {
  ArrowRight,
  Bell,
  Bookmark,
  Globe,
  History,
  LayoutDashboard,
  Radio,
  Shield,
  Star,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserWorkspace } from "@/hooks/useUserWorkspace";
import { useOperationalWorkspace } from "@/hooks/useOperationalWorkspace";
import { useLiveMatches } from "@/hooks/useLiveMatches";
import DemoCrest from "@/components/landing/premium/DemoCrest";
import PlanBadge from "@/components/billing/PlanBadge";
import { loginUrl } from "@/lib/auth/routes";
import { LEAGUE_PRESETS, TEAM_PRESETS } from "@/lib/workspace/operationalTypes";
import { matchHref, matchListLabel } from "@/lib/ux/hotMatches";
import type { Match } from "@/types/domain";
import { planLabelPt } from "@/lib/subscription/permissions";
import { useSmartWorkspace } from "@/hooks/useSmartWorkspace";
import { useBehaviorTrack } from "@/hooks/useBehaviorTrack";
import SmartWorkspacePanels from "@/components/workspace/SmartWorkspacePanels";
import "@/app/styles/workspace.css";

function fixtureLink(id: string, match?: Match): string {
  if (match) return matchHref(match);
  return `/match/${encodeURIComponent(id)}`;
}

function isMatchLive(m: Match): boolean {
  return m.status === "LIVE" || m.status === "HALFTIME";
}

function formatRelative(isoOrTs: string | number): string {
  const ms = typeof isoOrTs === "string" ? new Date(isoOrTs).getTime() : isoOrTs;
  const diff = Math.max(0, Date.now() - ms);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

export default function WorkspacePage() {
  const { user, plan, loading: authLoading } = useAuth();
  const ws = useUserWorkspace();
  const op = useOperationalWorkspace();
  const smart = useSmartWorkspace();
  const { track } = useBehaviorTrack();
  const { matches } = useLiveMatches({ pollIntervalMs: 30_000 });

  useEffect(() => {
    if (user) ws.persistRoute("/workspace");
    track("workspace_view");
  }, [user, ws.persistRoute, track]);

  const refreshSmart = smart.refresh;
  useEffect(() => {
    if (!user) return;
    void refreshSmart();
  }, [
    user,
    refreshSmart,
    op.operational.watchlist.length,
    op.operational.favoriteTeams.length,
    op.operational.favoriteLeagues.length,
  ]);

  const monitored = useMemo(() => {
    const ids = new Set<string>();
    op.operational.watchlist.forEach((w) => ids.add(w.fixtureId));
    op.legacy?.watched.forEach((id) => ids.add(id));
    op.legacy?.favorites.forEach((id) => ids.add(id));
    [...ws.favorites].forEach((id) => ids.add(id));
    ws.watched.forEach((id) => ids.add(id));

    return [...ids]
      .map((id) => {
        const m = matches.find(
          (x) => String(x.externalId ?? x.id) === id || String(x.id) === id
        );
        const wl = op.operational.watchlist.find((w) => w.fixtureId === id);
        return {
          id,
          label: m ? matchListLabel(m) : wl?.matchLabel ?? `Jogo ${id}`,
          score: m ? Math.round(m.pressure.score) : null,
          live: m ? isMatchLive(m) : false,
          inWatchlist: op.watchlistIds.has(id),
        };
      })
      .slice(0, 12);
  }, [matches, op.operational.watchlist, op.legacy, op.watchlistIds, ws.favorites, ws.watched]);

  const alerts = useMemo(() => {
    const fromDb = op.operational.alertHistory;
    const fromLegacy = ws.recentAlerts.map((a) => ({
        id: a.id,
        fixtureId: a.fixtureId,
        matchLabel: a.label,
        alertType: "recent",
        message: a.message,
        severity: "medium" as const,
        readAt: null,
        createdAt: new Date(a.ts).toISOString(),
      }));
    const merged = [...fromDb, ...fromLegacy];
    merged.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return merged.slice(0, 8);
  }, [op.operational.alertHistory, op.legacy, ws.recentAlerts]);

  const contextualHistory = useMemo(() => {
    const hist = op.legacy?.readingHistory ?? ws.readingHistory;
    return [...hist].sort((a, b) => b.ts - a.ts).slice(0, 8);
  }, [op.legacy, ws.readingHistory]);

  const dailySummary = useMemo(() => {
    const liveCount = matches.filter((m) => isMatchLive(m)).length;
    const highPressure = matches.filter((m) => m.pressure.score >= 65).length;
    return {
      liveCount,
      highPressure,
      watchlist: op.operational.watchlist.length,
      favorites: (op.legacy?.favorites.length ?? 0) + ws.favorites.size,
      teams: op.operational.favoriteTeams.length,
      leagues: op.operational.favoriteLeagues.length,
    };
  }, [matches, op.operational]);

  if (authLoading || op.loading) {
    return (
      <div className="gp-ws">
        <div className="gp-ws-skeleton" />
        <div className="gp-ws-grid">
          <div className="gp-ws-skeleton" />
          <div className="gp-ws-skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div className="gp-ws">
      {!user && (
        <div className="gp-ws-guest-banner">
          Entre na sua conta para persistir watchlist, times e ligas favoritos.{" "}
          <Link href={loginUrl("/workspace")}>Fazer login</Link>
        </div>
      )}

      <header className="gp-ws-hero">
        <div>
          <p className="gp-ws-hero__eyebrow">Workspace operacional</p>
          <h2 className="gp-ws-hero__title">
            {user ? `Olá, ${user.name.split(" ")[0]}` : "Sua central personalizada"}
          </h2>
          <p className="gp-ws-hero__sub">
            Monitoramento, alertas, favoritos e leituras — organizados como uma mesa
            institucional de live.
          </p>
          {user && (
            <p className="gp-ws-hero__sub" style={{ marginTop: "0.35rem" }}>
              <PlanBadge plan={plan} /> · {planLabelPt(plan)}
            </p>
          )}
        </div>
        <div className="gp-ws-hero__stats">
          <div className="gp-ws-stat">
            <strong>{dailySummary.watchlist}</strong>
            <span>Watchlist</span>
          </div>
          <div className="gp-ws-stat">
            <strong>{dailySummary.liveCount}</strong>
            <span>Ao vivo agora</span>
          </div>
          <div className="gp-ws-stat">
            <strong>{dailySummary.highPressure}</strong>
            <span>Alta pressão</span>
          </div>
          <div className="gp-ws-stat">
            <strong>{alerts.length}</strong>
            <span>Alertas recentes</span>
          </div>
        </div>
      </header>

      <SmartWorkspacePanels smart={smart.smart} loading={smart.loading} />

      <div className="gp-ws-terminal-cta">
        <div>
          <strong>Central ao vivo</strong>
          <p>
            Acesse o terminal com hero, GPI e leitura por partida — continuidade direta do seu
            workspace.
          </p>
        </div>
        <Link href="/terminal" className="gp-ws-btn gp-ws-btn--primary">
          Abrir terminal
          <Radio className="h-4 w-4" />
        </Link>
      </div>

      {op.error && (
        <p className="gp-ws-empty" role="alert">
          {op.error} — alterações locais podem não ter sido salvas.
        </p>
      )}

      <div className="gp-ws-grid gp-ws-grid--3">
        <section className="gp-ws-panel gp-ws-span-2">
          <div className="gp-ws-panel__head">
            <h3 className="gp-ws-panel__title">
              <LayoutDashboard className="h-4 w-4" />
              Jogos monitorados
            </h3>
            <Link href="/terminal" className="gp-ws-panel__action">
              Ver todos
            </Link>
          </div>
          {monitored.length === 0 ? (
            <p className="gp-ws-empty">
              Adicione jogos à watchlist no terminal ou marque favoritos para vê-los aqui.
            </p>
          ) : (
            <ul className="gp-ws-list">
              {monitored.map((row) => (
                <li key={row.id} className="gp-ws-row">
                  <div className="gp-ws-row__main">
                    <Link
                      href={fixtureLink(
                        row.id,
                        matches.find(
                          (x) => String(x.externalId ?? x.id) === row.id || String(x.id) === row.id
                        )
                      )}
                      className="gp-ws-row__label"
                    >
                      {row.label}
                    </Link>
                    <p className="gp-ws-row__meta">
                      {row.live ? "Ao vivo" : "Fora do ar"} ·{" "}
                      {row.inWatchlist ? "Watchlist" : "Acompanhado"}
                    </p>
                  </div>
                  {row.score != null && (
                    <span className="gp-ws-row__score">{row.score}</span>
                  )}
                  {user && (
                    <button
                      type="button"
                      className="gp-ws-btn gp-ws-btn--ghost"
                      onClick={() => {
                        if (row.inWatchlist) {
                          track("watchlist_remove", { fixtureId: row.id });
                          void op.removeWatchlist(row.id);
                        } else {
                          ws.markWatched(row.id, row.label);
                          track("watchlist_add", {
                            fixtureId: row.id,
                            payload: { pressure: row.score },
                          });
                          void op.addWatchlist(row.id, row.label);
                        }
                      }}
                    >
                      {row.inWatchlist ? "Remover" : "+ WL"}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="gp-ws-panel">
          <div className="gp-ws-panel__head">
            <h3 className="gp-ws-panel__title">
              <Bell className="h-4 w-4" />
              Alertas recentes
            </h3>
          </div>
          {alerts.length === 0 ? (
            <p className="gp-ws-empty">Nenhum alerta registrado ainda.</p>
          ) : (
            <ul className="gp-ws-list">
              {alerts.map((a) => (
                <li
                  key={a.id}
                  className={`gp-ws-row${a.severity === "high" ? " gp-ws-alert--high" : ""}`}
                >
                  <div className="gp-ws-row__main">
                    <p className="gp-ws-row__label">{a.matchLabel ?? "Alerta"}</p>
                    <p className="gp-ws-row__meta">
                      {a.message} · {formatRelative(a.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="gp-ws-panel">
          <div className="gp-ws-panel__head">
            <h3 className="gp-ws-panel__title">
              <Globe className="h-4 w-4" />
              Ligas favoritas
            </h3>
          </div>
          <div className="gp-ws-chip-row" style={{ marginBottom: "0.75rem" }}>
            {LEAGUE_PRESETS.map((l) => {
              const on = op.operational.favoriteLeagues.some((f) => f.leagueId === l.leagueId);
              return (
                <button
                  key={l.leagueId}
                  type="button"
                  className={`gp-ws-chip${on ? " gp-ws-chip--on" : ""}`}
                  disabled={!user}
                  onClick={() => {
                    if (on) {
                      void op.removeLeague(l.leagueId);
                    } else {
                      track("league_favorite", { leagueId: l.leagueId });
                      void op.addLeague({
                        leagueId: l.leagueId,
                        leagueName: l.leagueName,
                        country: l.country,
                      });
                    }
                  }}
                >
                  {l.leagueName}
                </button>
              );
            })}
          </div>
          {op.operational.favoriteLeagues.length === 0 ? (
            <p className="gp-ws-empty">Selecione ligas para priorizar na sua operação.</p>
          ) : (
            <ul className="gp-ws-list">
              {op.operational.favoriteLeagues.map((l) => (
                <li key={l.id} className="gp-ws-row">
                  <div className="gp-ws-row__main">
                    <p className="gp-ws-row__label">{l.leagueName}</p>
                    <p className="gp-ws-row__meta">{l.country ?? "—"}</p>
                  </div>
                  {user && (
                    <button
                      type="button"
                      className="gp-ws-chip__remove"
                      aria-label={`Remover ${l.leagueName}`}
                      onClick={() => void op.removeLeague(l.leagueId)}
                    >
                      ×
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="gp-ws-panel">
          <div className="gp-ws-panel__head">
            <h3 className="gp-ws-panel__title">
              <Users className="h-4 w-4" />
              Times favoritos
            </h3>
          </div>
          <div className="gp-ws-chip-row" style={{ marginBottom: "0.75rem" }}>
            {TEAM_PRESETS.map((t) => {
              const on = op.operational.favoriteTeams.some((f) => f.teamId === t.teamId);
              return (
                <button
                  key={t.teamId}
                  type="button"
                  className={`gp-ws-chip${on ? " gp-ws-chip--on" : ""}`}
                  disabled={!user}
                  onClick={() => {
                    if (on) {
                      void op.removeTeam(t.teamId);
                    } else {
                      track("team_favorite", { teamId: t.teamId });
                      void op.addTeam({
                        teamId: t.teamId,
                        teamName: t.teamName,
                        logoPath: t.logoPath,
                        leagueName: t.leagueName,
                      });
                    }
                  }}
                >
                  <DemoCrest logoPath={t.logoPath} teamName={t.teamName} size={18} />
                  {t.teamName}
                </button>
              );
            })}
          </div>
          {op.operational.favoriteTeams.length === 0 ? (
            <p className="gp-ws-empty">Marque clubes para destacar confrontos relevantes.</p>
          ) : (
            <ul className="gp-ws-list">
              {op.operational.favoriteTeams.map((t) => (
                <li key={t.id} className="gp-ws-row">
                  <DemoCrest
                    logoPath={t.logoPath ?? ""}
                    teamName={t.teamName}
                    size={24}
                  />
                  <div className="gp-ws-row__main">
                    <p className="gp-ws-row__label">{t.teamName}</p>
                    <p className="gp-ws-row__meta">{t.leagueName ?? "—"}</p>
                  </div>
                  {user && (
                    <button
                      type="button"
                      className="gp-ws-chip__remove"
                      onClick={() => void op.removeTeam(t.teamId)}
                    >
                      ×
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="gp-ws-panel">
          <div className="gp-ws-panel__head">
            <h3 className="gp-ws-panel__title">
              <Bookmark className="h-4 w-4" />
              Watchlist operacional
            </h3>
          </div>
          {op.operational.watchlist.length === 0 ? (
            <p className="gp-ws-empty">
              Use &quot;+ WL&quot; nos jogos monitorados ou adicione pelo terminal.
            </p>
          ) : (
            <ul className="gp-ws-list">
              {op.operational.watchlist.map((w) => (
                <li key={w.id} className="gp-ws-row">
                  <div className="gp-ws-row__main">
                    <Link
                      href={fixtureLink(
                        w.fixtureId,
                        matches.find(
                          (x) =>
                            String(x.externalId ?? x.id) === w.fixtureId ||
                            String(x.id) === w.fixtureId
                        )
                      )}
                      className="gp-ws-row__label"
                    >
                      {w.matchLabel ?? `Fixture ${w.fixtureId}`}
                    </Link>
                    <p className="gp-ws-row__meta">
                      Prioridade {w.priority} · {formatRelative(w.updatedAt)}
                    </p>
                  </div>
                  {user && (
                    <button
                      type="button"
                      className="gp-ws-btn gp-ws-btn--ghost"
                      onClick={() => void op.removeWatchlist(w.fixtureId)}
                    >
                      Remover
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="gp-ws-panel">
          <div className="gp-ws-panel__head">
            <h3 className="gp-ws-panel__title">
              <Shield className="h-4 w-4" />
              Resumo diário
            </h3>
          </div>
          <div className="gp-ws-summary-grid">
            <div className="gp-ws-summary-item">
              <span>Jogos ao vivo</span>
              <strong>{dailySummary.liveCount}</strong>
            </div>
            <div className="gp-ws-summary-item">
              <span>Alta pressão</span>
              <strong>{dailySummary.highPressure}</strong>
            </div>
            <div className="gp-ws-summary-item">
              <span>Favoritos</span>
              <strong>{dailySummary.favorites}</strong>
            </div>
            <div className="gp-ws-summary-item">
              <span>Ligas salvas</span>
              <strong>{dailySummary.leagues}</strong>
            </div>
          </div>
        </section>

        <section className="gp-ws-panel gp-ws-span-2">
          <div className="gp-ws-panel__head">
            <h3 className="gp-ws-panel__title">
              <History className="h-4 w-4" />
              Histórico contextual recente
            </h3>
            <Link href="/terminal" className="gp-ws-panel__action">
              Continuar leitura
              <ArrowRight className="inline h-3 w-3" />
            </Link>
          </div>
          {contextualHistory.length === 0 ? (
            <p className="gp-ws-empty">
              Abra partidas no terminal para construir seu histórico de leitura.
            </p>
          ) : (
            <ul className="gp-ws-list">
              {contextualHistory.map((h) => (
                <li key={`${h.fixtureId}-${h.ts}`} className="gp-ws-row">
                  <div className="gp-ws-row__main">
                    <Link
                      href={fixtureLink(
                        h.fixtureId,
                        matches.find(
                          (x) =>
                            String(x.externalId ?? x.id) === h.fixtureId ||
                            String(x.id) === h.fixtureId
                        )
                      )}
                      className="gp-ws-row__label"
                    >
                      {h.label}
                    </Link>
                    <p className="gp-ws-row__meta">
                      {h.narrative ?? "Leitura registrada"} · {formatRelative(h.ts)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="gp-ws-panel">
          <div className="gp-ws-panel__head">
            <h3 className="gp-ws-panel__title">
              <Star className="h-4 w-4" />
              Favoritos rápidos
            </h3>
          </div>
          {ws.favorites.size === 0 && !(op.legacy?.favorites.length) ? (
            <p className="gp-ws-empty">Favorite jogos no terminal com o ícone de estrela.</p>
          ) : (
            <ul className="gp-ws-list">
              {[...ws.favorites].slice(0, 6).map((id) => {
                const m = matches.find(
                  (x) => String(x.externalId ?? x.id) === id || String(x.id) === id
                );
                return (
                  <li key={id} className="gp-ws-row">
                    <div className="gp-ws-row__main">
                      <Link href={fixtureLink(id, m)} className="gp-ws-row__label">
                        {m ? matchListLabel(m) : `Jogo ${id}`}
                      </Link>
                    </div>
                    <button
                      type="button"
                      className="gp-ws-chip__remove"
                      onClick={() => ws.toggleFavorite(id)}
                      aria-label="Remover favorito"
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
