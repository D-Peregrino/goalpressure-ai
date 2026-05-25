"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bell,
  Bookmark,
  Flame,
  History,
  Play,
  Shield,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useUserWorkspace } from "@/hooks/useUserWorkspace";
import { useLiveMatches } from "@/hooks/useLiveMatches";
import DataSourceBadge from "@/components/ui/DataSourceBadge";
import { hasTerminalAccess } from "@/lib/auth/entitlements";
import PlanBadge from "@/components/billing/PlanBadge";
import LiveDataSourceStrip from "@/components/live/LiveDataSourceStrip";
import LiveFeedEmptyState from "@/components/live/LiveFeedEmptyState";
import { planLabelPt, subscriptionActive, isPaidPlan } from "@/lib/subscription/permissions";
import OnboardingModal from "@/components/onboarding/OnboardingModal";
import SpotlightTour from "@/components/onboarding/SpotlightTour";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";
import SmartTooltip from "@/components/onboarding/SmartTooltip";
import { useOnboarding } from "@/hooks/useOnboarding";
import { matchHref, matchListLabel, rankMatchesForUser } from "@/lib/ux/hotMatches";
import { getMatchLabel } from "@/types/domain";

function formatRelative(ts: number | string): string {
  const ms = typeof ts === "string" ? new Date(ts).getTime() : ts;
  const diff = Math.max(0, Date.now() - ms);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

export default function PersonalDashboard() {
  const { user, loading: authLoading, plan, subscriptionStatus } = useAuth();
  const { isAdmin } = useSubscription();
  const ws = useUserWorkspace();
  const onboarding = useOnboarding();
  const {
    matches,
    signals,
    source,
    dataSourceBadge,
    error: liveError,
    lastUpdated,
    responseTime,
    status: feedStatus,
    isEmpty,
  } = useLiveMatches({
    pollIntervalMs: 30_000,
    staleAfterMs: 60_000,
  });

  const terminalAccess = user
    ? hasTerminalAccess(plan, user.role, subscriptionStatus)
    : false;

  useEffect(() => {
    if (!user) return;
    ws.persistRoute("/minha-central");
  }, [user, ws.persistRoute]);

  const hotFromLive = useMemo(
    () => rankMatchesForUser(matches, ws.favorites, ws.watched).slice(0, 6),
    [matches, ws.favorites, ws.watched]
  );

  type HotRow = { id: string; label: string; score: number };
  const hotMatches: HotRow[] = hotFromLive.map((m) => ({
    id: String(m.externalId ?? m.id),
    label: matchListLabel(m),
    score: Math.round(m.pressure.score),
  }));

  const liveReadingsFromSignals = useMemo(
    () =>
      signals.slice(0, 8).map((s) => {
        const m = matches.find((x) => x.id === s.matchId || x.externalId === s.matchId);
        return {
          fixtureId: s.matchId,
          label: m ? matchListLabel(m) : s.matchId,
          narrative: `${s.market} · ${s.confidence}`,
          ts: Date.now(),
        };
      }),
    [signals, matches]
  );

  const alertsList =
    ws.recentAlerts.length > 0
      ? ws.recentAlerts
      : signals.slice(0, 5).map((s, i) => {
          const m = matches.find((x) => x.id === s.matchId || x.externalId === s.matchId);
          return {
            id: `live-sig-${i}`,
            fixtureId: s.matchId,
            label: m ? matchListLabel(m) : s.matchLabel,
            message: `${s.market} · pressão ${Math.round(s.pressureScore)}`,
            ts: Date.now(),
          };
        });

  const readingsList =
    ws.readingHistory.length > 0 ? ws.readingHistory : liveReadingsFromSignals;

  const opportunitiesList =
    ws.saved.length > 0 ? ws.saved : ws.recent.length > 0 ? ws.recent : [];

  if (authLoading) {
    return <DashboardSkeleton />;
  }

  if (!user) {
    return (
      <div className="gp-dash-guest">
        <h2>Sua central começa aqui</h2>
        <p>Entre para salvar favoritos, jogos acompanhados e histórico de leituras.</p>
        <div className="gp-dash-guest__cta">
          <Link href="/entrar" className="gp-btn gp-btn--primary">
            Entrar
          </Link>
          <Link href="/cadastro" className="gp-btn gp-btn--secondary">
            Criar conta
          </Link>
        </div>
        <Link href="/terminal" className="gp-dash-link">
          Explorar central ao vivo sem conta →
        </Link>
      </div>
    );
  }

  const firstName = user.name?.split(" ")[0] || "Operador";
  const paidActive =
    isAdmin || (isPaidPlan(plan) && subscriptionActive(subscriptionStatus));

  return (
    <>
      {!isAdmin && (
        <>
          <OnboardingModal
            open={onboarding.open}
            step={onboarding.step}
            onStep={onboarding.setStep}
            onComplete={onboarding.complete}
            onSkip={onboarding.skip}
          />
          <SpotlightTour
            open={ws.spotlightOpen && !onboarding.open}
            step={ws.spotlightStep}
            onStep={ws.setSpotlightStep}
            onComplete={ws.completeSpotlight}
            onSkip={ws.skipSpotlight}
          />
        </>
      )}

      <header className="gp-dash-hero" data-gp-tour="central-hero">
        <div>
          <p className="gp-dash-eyebrow">Minha central</p>
          <h1 className="gp-dash-hero__title">Olá, {firstName}</h1>
          <p className="gp-dash-hero__sub">
            {terminalAccess
              ? "Acesso completo à central ao vivo, alertas e leitura tática."
              : "Ative o Fundador para liberar a central completa — abaixo você vê o feed global do sistema."}
          </p>
        </div>
        <div className="gp-dash-hero__aside">
          <PlanBadge plan={plan} isAdmin={isAdmin || user.role === "admin"} />
          <DataSourceBadge source={source} error={liveError} />
          {dataSourceBadge && source === "sportmonks" && (
            <span className="gp-type-caption text-muted">{dataSourceBadge}</span>
          )}
          <span className="gp-dash-sync" data-state={ws.syncState}>
            {ws.syncState === "synced"
              ? "Sincronizado"
              : ws.syncState === "loading"
                ? "Sincronizando…"
                : "Modo local"}
          </span>
        </div>
      </header>

      {terminalAccess && (
        <div className="gp-dash-cta-banner">
          <div>
            <h2 className="gp-dash-cta-banner__title">
              {isAdmin ? (
                <>
                  <Shield className="inline h-5 w-5 mr-2" />
                  Painel administrador
                </>
              ) : (
                "Plano Fundador ativo"
              )}
            </h2>
            <p className="gp-dash-muted">
              Abra a central ao vivo para ver partidas, sinais e leituras em tempo real.
            </p>
          </div>
          <div className="gp-dash-cta-banner__actions">
            <Link href="/terminal" className="gp-btn gp-btn--primary" data-gp-tour="terminal-link">
              <Play className="h-4 w-4" /> Central ao vivo
            </Link>
            {isAdmin && (
              <Link href="/admin" className="gp-btn gp-btn--secondary">
                Admin
              </Link>
            )}
          </div>
        </div>
      )}

      {!terminalAccess && (
        <div className="gp-dash-cta-banner gp-dash-cta-banner--upgrade">
          <p className="gp-dash-muted">
            Seu plano: <strong>{planLabelPt(plan)}</strong>. A central mostra até 6 jogos no gratuito.
          </p>
          <Link href="/precos" className="gp-btn gp-btn--primary">
            Ativar Plano Fundador
          </Link>
          <Link href="/terminal" className="gp-btn gp-btn--secondary">
            Ver central (limitada)
          </Link>
        </div>
      )}

      <div className="gp-dash-quick">
        <Link
          href="/terminal"
          className="gp-dash-quick-card gp-dash-quick-card--primary"
          data-gp-tour="terminal-link"
        >
          <Play className="h-5 w-5" />
          <span>Central ao vivo</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
        {isAdmin && (
          <Link href="/admin" className="gp-dash-quick-card">
            <Shield className="h-5 w-5" />
            <span>Painel admin</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
        <Link href="/precos" className="gp-dash-quick-card">
          <Sparkles className="h-5 w-5" />
          <span>{paidActive ? "Seu plano" : "Ativar Fundador"}</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link href="/conta" className="gp-dash-quick-card">
          <Star className="h-5 w-5" />
          <span>Minha conta</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <LiveDataSourceStrip
        source={source}
        status={feedStatus}
        lastUpdated={lastUpdated}
        matchCount={matches.length}
        responseTimeMs={responseTime}
        error={liveError}
        className="mb-4"
      />

      {isEmpty && matches.length === 0 && (
        <LiveFeedEmptyState
          source={source}
          matchCount={0}
          lastUpdated={lastUpdated}
          responseTimeMs={responseTime}
          error={liveError}
          compact
        />
      )}

      <div className="gp-dash-grid">
        <section className="gp-dash-panel" data-gp-tour="favorites">
          <h2>
            <SmartTooltip label="Favoritos" tip="Jogos que você marcou com estrela na central.">
              <Bookmark className="h-4 w-4" />
            </SmartTooltip>{" "}
            Favoritos
          </h2>
          {ws.favorites.size === 0 ? (
            <p className="gp-dash-muted">
              Nenhum favorito ainda. Abra a central ao vivo e marque jogos reais da SportMonks.
            </p>
          ) : (
            <ul className="gp-dash-list">
              {[...ws.favorites].slice(0, 6).map((id) => {
                const live = matches.find((m) => m.id === id || m.externalId === id);
                const label = live ? getMatchLabel(live) : `Jogo ${id}`;
                return (
                  <li key={id}>
                    <Link href={`/match/${encodeURIComponent(id)}`}>{label}</Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="gp-dash-panel">
          <h2>
            <History className="h-4 w-4" /> Acompanhados
          </h2>
          {ws.watched.length === 0 ? (
            <p className="gp-dash-muted">
              Histórico pessoal vazio — acompanhe jogos na central ao vivo.
            </p>
          ) : (
            <ul className="gp-dash-list">
              {ws.watched.slice(0, 6).map((id) => {
                const live = matches.find((m) => m.id === id || m.externalId === id);
                const label = live ? getMatchLabel(live) : `Fixture ${id}`;
                return (
                  <li key={id}>
                    <Link href={`/match/${encodeURIComponent(id)}`}>{label}</Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="gp-dash-panel">
          <h2>
            <Bell className="h-4 w-4" /> Alertas recentes
          </h2>
          {alertsList.length === 0 ? (
            <p className="gp-dash-muted">
              Nenhum alerta ao vivo. Aguarde sincronização SportMonks ou abra o terminal.
            </p>
          ) : (
            <ul className="gp-dash-readings">
              {alertsList.map((a) => (
                <li key={a.id}>
                  <Link href={`/match/${encodeURIComponent(a.fixtureId)}`} className="gp-dash-reading">
                    <span className="gp-dash-reading__label">{a.label}</span>
                    <span className="gp-dash-reading__sub">{a.message}</span>
                    <span className="gp-dash-reading__time">{formatRelative(a.ts)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="gp-dash-panel gp-dash-panel--wide">
          <h2>
            Leituras recentes
          </h2>
          {readingsList.length === 0 ? (
            <p className="gp-dash-muted">
              Nenhuma leitura recente. Os sinais aparecem quando há jogos ao vivo na SportMonks.
            </p>
          ) : (
            <ul className="gp-dash-readings">
              {readingsList.slice(0, 8).map((item) => (
                <li key={`${item.fixtureId}-${item.ts}`}>
                  <Link
                    href={`/match/${encodeURIComponent(item.fixtureId)}`}
                    className="gp-dash-reading"
                  >
                    <span className="gp-dash-reading__label">{item.label}</span>
                    {"narrative" in item && item.narrative && (
                      <span className="gp-dash-reading__sub">{item.narrative}</span>
                    )}
                    <span className="gp-dash-reading__time">{formatRelative(item.ts)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="gp-dash-panel">
          <h2>
            <Zap className="h-4 w-4" /> Oportunidades
          </h2>
          {opportunitiesList.length === 0 ? (
            <p className="gp-dash-muted">Sem oportunidades salvas no momento.</p>
          ) : (
            <ul className="gp-dash-readings">
              {opportunitiesList.slice(0, 5).map((item) => (
                <li key={`${item.fixtureId}-${item.ts}`}>
                  <Link
                    href={`/match/${encodeURIComponent(item.fixtureId)}`}
                    className="gp-dash-reading"
                  >
                    <span className="gp-dash-reading__label">{item.label}</span>
                    <span className="gp-dash-reading__sub">{item.narrative}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="gp-dash-panel gp-dash-panel--wide" data-gp-tour="hot-matches">
          <h2>
            <Flame className="h-4 w-4" /> Mais quentes
          </h2>
          {hotMatches.length === 0 ? (
            <p className="gp-dash-muted">
              Nenhuma partida ao vivo disponível no momento. Dados exclusivos SportMonks.
            </p>
          ) : (
            <ul className="gp-dash-hot">
              {hotMatches.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/match/${encodeURIComponent(m.id)}`}
                    className="gp-dash-hot__row"
                  >
                    <span className="gp-dash-hot__label">{m.label}</span>
                    <span
                      className="gp-dash-hot__score"
                      data-tier={m.score >= 80 ? "high" : m.score >= 60 ? "mid" : "low"}
                    >
                      {m.score}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="gp-dash-panel">
          <h2>Seu plano</h2>
          <p className="gp-dash-plan-name">{isAdmin ? "Administrador" : planLabelPt(plan)}</p>
          <p className="gp-dash-muted">
            {isAdmin
              ? "Acesso total: central, auditoria, operador e painel admin."
              : paidActive
                ? "Acesso premium ativo na central e alertas."
                : "Até 6 jogos na central. Fundador libera leitura completa."}
          </p>
          {!paidActive && (
            <Link href="/precos" className="gp-btn gp-btn--primary gp-btn--sm mt-3">
              Ver Plano Fundador
            </Link>
          )}
        </section>

        <section className="gp-dash-panel gp-dash-panel--wide">
          <h2>Atividade recente</h2>
          {ws.activityLog.length === 0 ? (
            <p className="gp-dash-muted">Suas ações na central aparecem aqui.</p>
          ) : (
            <ul className="gp-dash-activity">
              {ws.activityLog.slice(0, 8).map((a) => (
                <li key={a.id}>
                  <span className="gp-dash-activity__label">{a.label}</span>
                  <span className="gp-dash-activity__time">{formatRelative(a.ts)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
