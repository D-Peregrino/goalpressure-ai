"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import {
  ArrowRight,
  Bell,
  Bookmark,
  Flame,
  History,
  Play,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useUserWorkspace } from "@/hooks/useUserWorkspace";
import { useLiveMatches } from "@/hooks/useLiveMatches";
import PlanBadge from "@/components/billing/PlanBadge";
import { planLabelPt } from "@/lib/subscription/permissions";
import OnboardingModal from "@/components/onboarding/OnboardingModal";
import SpotlightTour from "@/components/onboarding/SpotlightTour";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";
import SmartTooltip from "@/components/onboarding/SmartTooltip";
import { useOnboarding } from "@/hooks/useOnboarding";
import { matchHref, matchListLabel, rankMatchesForUser } from "@/lib/ux/hotMatches";
import { getMatchLabel } from "@/types/domain";

function formatRelative(ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

export default function PersonalDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { plan } = useSubscription();
  const ws = useUserWorkspace();
  const onboarding = useOnboarding();
  const { matches } = useLiveMatches({ pollIntervalMs: 30_000, staleAfterMs: 60_000 });

  useEffect(() => {
    if (user) ws.persistRoute("/minha-central");
  }, [user, ws]);

  const hotMatches = useMemo(
    () => rankMatchesForUser(matches, ws.favorites, ws.watched).slice(0, 6),
    [matches, ws.favorites, ws.watched]
  );

  if (authLoading || (user && !ws.ready)) {
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

  return (
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

      <header className="gp-dash-hero" data-gp-tour="central-hero">
        <div>
          <p className="gp-dash-eyebrow">Minha central</p>
          <h1 className="gp-dash-hero__title">Olá, {firstName}</h1>
          <p className="gp-dash-hero__sub">
            Favoritos, alertas, leituras e jogos quentes — tudo sincronizado para você.
          </p>
        </div>
        <div className="gp-dash-hero__aside">
          <PlanBadge plan={plan} />
          <span className="gp-dash-sync" data-state={ws.syncState}>
            {ws.syncState === "synced"
              ? "Sincronizado"
              : ws.syncState === "loading"
                ? "Sincronizando…"
                : "Modo local"}
          </span>
        </div>
      </header>

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
        <Link href="/precos" className="gp-dash-quick-card">
          <Sparkles className="h-5 w-5" />
          <span>{plan === "free" ? "Ativar Fundador" : "Seu plano"}</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link href="/conta" className="gp-dash-quick-card">
          <Star className="h-5 w-5" />
          <span>Minha conta</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="gp-dash-grid">
        <section className="gp-dash-panel" data-gp-tour="favorites">
          <h2>
            <SmartTooltip label="Favoritos" tip="Jogos que você marcou com estrela na central.">
              <Bookmark className="h-4 w-4" />
            </SmartTooltip>{" "}
            Favoritos
          </h2>
          {ws.favorites.size === 0 ? (
            <p className="gp-dash-muted">Nenhum jogo favoritado ainda.</p>
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
          <Link href="/terminal" className="gp-dash-link">
            Ver na central →
          </Link>
        </section>

        <section className="gp-dash-panel">
          <h2>
            <History className="h-4 w-4" /> Acompanhados
          </h2>
          {ws.watched.length === 0 ? (
            <p className="gp-dash-muted">Os jogos que você abrir aparecem aqui.</p>
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
          {ws.recentAlerts.length === 0 ? (
            <p className="gp-dash-muted">Alertas operacionais aparecem aqui ao vivo.</p>
          ) : (
            <ul className="gp-dash-readings">
              {ws.recentAlerts.slice(0, 5).map((a) => (
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
          <h2>Leituras recentes</h2>
          {ws.readingHistory.length === 0 ? (
            <p className="gp-dash-muted">
              Abra um jogo na central para construir seu histórico de leitura.
            </p>
          ) : (
            <ul className="gp-dash-readings">
              {ws.readingHistory.slice(0, 8).map((item) => (
                <li key={`${item.fixtureId}-${item.ts}`}>
                  <Link
                    href={`/match/${encodeURIComponent(item.fixtureId)}`}
                    className="gp-dash-reading"
                  >
                    <span className="gp-dash-reading__label">{item.label}</span>
                    {item.narrative && (
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
            <Zap className="h-4 w-4" /> Oportunidades salvas
          </h2>
          {ws.saved.length === 0 && ws.recent.length === 0 ? (
            <p className="gp-dash-muted">Salve oportunidades na central para revisitar depois.</p>
          ) : (
            <ul className="gp-dash-readings">
              {(ws.saved.length > 0 ? ws.saved : ws.recent).slice(0, 5).map((item) => (
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
            <Flame className="h-4 w-4" /> Mais quentes para você
          </h2>
          {hotMatches.length === 0 ? (
            <p className="gp-dash-muted">Aguardando jogos ao vivo na central…</p>
          ) : (
            <ul className="gp-dash-hot">
              {hotMatches.map((m) => (
                <li key={m.id}>
                  <Link href={matchHref(m)} className="gp-dash-hot__row">
                    <span className="gp-dash-hot__label">{matchListLabel(m)}</span>
                    <span
                      className="gp-dash-hot__score"
                      data-tier={m.pressure.score >= 80 ? "high" : m.pressure.score >= 60 ? "mid" : "low"}
                    >
                      {Math.round(m.pressure.score)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/terminal" className="gp-dash-link">
            Abrir central ao vivo →
          </Link>
        </section>

        <section className="gp-dash-panel">
          <h2>Seu plano</h2>
          <p className="gp-dash-plan-name">{planLabelPt(plan)}</p>
          <p className="gp-dash-muted">
            {plan === "free"
              ? "Até 6 jogos na central. Fundador libera leitura completa."
              : "Acesso premium ativo na central e alertas."}
          </p>
          {plan === "free" && (
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
