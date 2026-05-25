"use client";

import Link from "next/link";
import { useEffect } from "react";
import {
  ArrowRight,
  Bookmark,
  History,
  Play,
  Sparkles,
  Star,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useUserWorkspace } from "@/hooks/useUserWorkspace";
import PlanBadge from "@/components/billing/PlanBadge";
import { planLabelPt } from "@/lib/subscription/permissions";
import OnboardingModal from "@/components/onboarding/OnboardingModal";
import { useOnboarding } from "@/hooks/useOnboarding";

export default function PersonalDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { plan } = useSubscription();
  const ws = useUserWorkspace();
  const onboarding = useOnboarding();

  useEffect(() => {
    if (user) ws.persistRoute("/inicio");
  }, [user, ws]);

  if (authLoading) {
    return <p className="gp-dash-muted">Restaurando sua sessão…</p>;
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

      <header className="gp-dash-hero">
        <div>
          <p className="gp-dash-eyebrow">Bem-vindo de volta</p>
          <h1 className="gp-dash-hero__title">Olá, {firstName}</h1>
          <p className="gp-dash-hero__sub">
            Continue de onde parou — favoritos, jogos acompanhados e leituras recentes.
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
        <Link href="/terminal" className="gp-dash-quick-card gp-dash-quick-card--primary">
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
        <section className="gp-dash-panel">
          <h2>
            <Bookmark className="h-4 w-4" /> Favoritos
          </h2>
          {ws.favorites.size === 0 ? (
            <p className="gp-dash-muted">Nenhum jogo favoritado ainda.</p>
          ) : (
            <ul className="gp-dash-list">
              {[...ws.favorites].slice(0, 6).map((id) => (
                <li key={id}>
                  <Link href={`/match/${encodeURIComponent(id)}`}>Jogo #{id}</Link>
                </li>
              ))}
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
              {ws.watched.slice(0, 6).map((id) => (
                <li key={id}>
                  <Link href={`/match/${encodeURIComponent(id)}`}>Fixture {id}</Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="gp-dash-panel gp-dash-panel--wide">
          <h2>Leituras recentes</h2>
          {ws.readingHistory.length === 0 && ws.recent.length === 0 ? (
            <p className="gp-dash-muted">
              Abra um jogo na central para construir seu histórico de leitura.
            </p>
          ) : (
            <ul className="gp-dash-readings">
              {(ws.readingHistory.length > 0 ? ws.readingHistory : ws.recent)
                .slice(0, 8)
                .map((item) => (
                  <li key={`${item.fixtureId}-${item.ts}`}>
                    <Link
                      href={`/match/${encodeURIComponent(item.fixtureId)}`}
                      className="gp-dash-reading"
                    >
                      <span className="gp-dash-reading__label">{item.label}</span>
                      {"narrative" in item && item.narrative && (
                        <span className="gp-dash-reading__sub">{item.narrative}</span>
                      )}
                    </Link>
                  </li>
                ))}
            </ul>
          )}
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
      </div>
    </>
  );
}
