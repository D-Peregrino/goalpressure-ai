"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import LandingNav from "@/components/landing/LandingNav";
import UpgradeCard from "@/components/billing/UpgradeCard";
import LeadCaptureForm from "@/components/landing/LeadCaptureForm";
import FooterSection from "@/components/landing/FooterSection";
import LiveTerminalPreview from "@/components/ui/terminal/LiveTerminalPreview";
import { CUPOM_BARBOSATIPS75 } from "@/lib/subscription/plans";

const FAQ = [
  {
    q: "O GoalPressure garante lucro?",
    a: "Não. É uma plataforma de leitura e análise esportiva ao vivo. Não prometemos resultados financeiros.",
  },
  {
    q: "Preciso entender estatística avançada?",
    a: "Não. A central traduz pressão, ritmo e mercado em linguagem clara para decisão rápida.",
  },
  {
    q: "Quantos jogos vejo no plano gratuito?",
    a: "Até 6 jogos simultâneos com leitura básica. O Plano Fundador libera a central completa.",
  },
  {
    q: "Como funciona o cupom BarbosaTips75?",
    a: "Aplica 75% de desconto no Plano Fundador de lançamento (R$ 49 → R$ 12,25/mês no checkout).",
  },
];

export default function CommercialLanding() {
  return (
    <div className="gp-landing gp-landing--commercial gp-marketing">
      <div className="gp-landing__ambient" aria-hidden />
      <LandingNav />

      <section className="gp-comm-hero">
        <div className="gp-landing-container gp-comm-hero__grid">
          <div>
            <p className="gp-landing-eyebrow">GoalPressure AI</p>
            <h1 className="gp-comm-hero__title">
              Entenda o jogo antes do mercado reagir.
            </h1>
            <p className="gp-comm-hero__sub">
              O GoalPressure monitora partidas em tempo real, interpreta pressão ofensiva,
              movimentação de odds e mudanças de ritmo para destacar os jogos que merecem sua
              atenção.
            </p>
            <div className="gp-comm-hero__cta">
              <Link href="/cadastro?cupom=BARBOSATIPS75" className="gp-btn gp-btn--primary">
                Entrar como fundador
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href={`/precos?cupom=${CUPOM_BARBOSATIPS75}`} className="gp-btn gp-btn--secondary">
                Usar cupom BarbosaTips75
              </Link>
              <Link href="/terminal" className="gp-btn gp-btn--ghost">
                Ver central ao vivo
              </Link>
            </div>
          </div>
          <UpgradeCard initialCoupon={CUPOM_BARBOSATIPS75} showCouponField />
        </div>
      </section>

      <section className="gp-landing-section">
        <div className="gp-landing-container">
          <h2 className="gp-landing-section__title">Como funciona</h2>
          <div className="gp-comm-steps">
            <article>
              <h3>1. Monitora</h3>
              <p>Placar, minuto, stats e odds ao vivo em uma única central.</p>
            </article>
            <article>
              <h3>2. Interpreta</h3>
              <p>Pressão ofensiva e ritmo viram narrativa clara por jogo.</p>
            </article>
            <article>
              <h3>3. Prioriza</h3>
              <p>Hero, alertas e ranking mostram onde olhar primeiro.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="gp-landing-section gp-landing-section--muted">
        <div className="gp-landing-container gp-comm-hero__grid">
          <div>
            <h2 className="gp-landing-section__title">Central ao vivo</h2>
            <p className="gp-comm-section__sub">
              Dados reais da SportMonks — placar, pressão e leitura por partida. Sem fixtures
              fictícias; se não houver jogo in-play, o feed fica vazio de forma honesta.
            </p>
            <Link href="/terminal" className="gp-btn gp-btn--secondary mt-4 inline-flex">
              Abrir terminal
            </Link>
          </div>
          <LiveTerminalPreview />
        </div>
      </section>

      <section className="gp-landing-section">
        <div className="gp-landing-container">
          <h2 className="gp-landing-section__title">Oportunidades e alertas</h2>
          <p className="gp-comm-section__sub">
            Quando o mercado acelera ou a pressão sobe, você vê o contexto em português — sem
            painel técnico.
          </p>
        </div>
      </section>

      <section id="planos" className="gp-landing-section gp-landing-section--muted">
        <div className="gp-landing-container">
          <h2 className="gp-landing-section__title text-center">Plano Fundador — vagas limitadas</h2>
          <p className="text-center text-[var(--muted)] mb-8">
            Profissional e Elite: em breve. Hoje só o lançamento fundador está ativo.
          </p>
          <div className="gp-comm-pricing-single">
            <UpgradeCard initialCoupon={CUPOM_BARBOSATIPS75} />
          </div>
        </div>
      </section>

      <section className="gp-landing-section">
        <div className="gp-landing-container gp-comm-trust">
          <h2 className="gp-landing-section__title">Prova de confiança</h2>
          <ul>
            <li>Leitura baseada em dados reais do jogo e do mercado</li>
            <li>Indicador de confiança por partida (forte / moderada / limitada)</li>
            <li>Sem promessa de lucro — foco em clareza operacional</li>
          </ul>
        </div>
      </section>

      <section className="gp-landing-section gp-landing-section--muted">
        <div className="gp-landing-container">
          <h2 className="gp-landing-section__title">Perguntas frequentes</h2>
          <dl className="gp-comm-faq">
            {FAQ.map((f) => (
              <div key={f.q}>
                <dt>{f.q}</dt>
                <dd>{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="gp-landing-section">
        <div className="gp-landing-container gp-comm-final">
          <h2 className="gp-landing-section__title">Entre na lista ou ative agora</h2>
          <LeadCaptureForm source="landing" showCoupon />
        </div>
      </section>

      <FooterSection />
    </div>
  );
}
