import Link from "next/link";
import { ArrowRight, Sparkles, Zap } from "lucide-react";
import LandingAmbient from "@/components/landing/premium/LandingAmbient";
import PremiumNav from "@/components/landing/premium/PremiumNav";
import PremiumHero from "@/components/landing/premium/PremiumHero";
import CurveDivider from "@/components/landing/premium/CurveDivider";
import InteractiveTerminalDemo from "@/components/landing/premium/InteractiveTerminalDemo";
import GpiShowcase from "@/components/landing/premium/GpiShowcase";
import TelegramMockPremium from "@/components/landing/premium/TelegramMockPremium";
import DiffSection from "@/components/landing/premium/DiffSection";
import PlansFinale from "@/components/landing/premium/PlansFinale";
import MobileCtaBar from "@/components/landing/premium/MobileCtaBar";
import ScrollReveal, { StaggerReveal, StaggerItem } from "@/components/landing/premium/ScrollReveal";
import { BRAND } from "@/lib/design/brand";

const FAQ = [
  {
    q: "O GoalPressure garante lucro nas apostas?",
    a: "Não. Somos uma plataforma de inteligência esportiva ao vivo. Entregamos contexto, pressão e leitura de mercado — a decisão final é sempre sua.",
  },
  {
    q: "Preciso ser analista profissional para usar?",
    a: "Não. A interface traduz dados complexos em narrativa clara em português, para você agir em segundos durante o jogo.",
  },
  {
    q: "Quantos jogos acompanho no plano gratuito?",
    a: "Até seis partidas simultâneas com leitura básica de pressão. A central completa desbloqueia no Plano Fundador.",
  },
  {
    q: "Os alertas no Telegram são automáticos?",
    a: "Sim, quando configurados na sua conta. Você recebe destaques de pressão, GPI elevado e mudanças relevantes — sem ficar preso à tela.",
  },
];

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="gpl-feature-list">
      {items.map((item) => (
        <li key={item}>
          <Zap className="h-4 w-4 shrink-0" aria-hidden />
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function PremiumLanding() {
  const year = new Date().getFullYear();

  return (
    <div className="gpl gpl--elite">
      <LandingAmbient />
      <PremiumNav />
      <PremiumHero />
      <MobileCtaBar />

      <CurveDivider />

      <section id="produto" className="gpl-section">
        <div className="gpl-wrap">
          <ScrollReveal className="gpl-section__head gpl-section__head--center">
            <p className="gpl-eyebrow">
              <Sparkles className="inline h-3 w-3 align-middle opacity-80" /> Como funciona
            </p>
            <h2 className="gpl-section__title">Do apito inicial à decisão informada</h2>
            <p className="gpl-section__sub">
              Três etapas. Visual de produto premium. Zero aparência de ferramenta interna.
            </p>
          </ScrollReveal>
          <StaggerReveal className="gpl-steps">
            <StaggerItem>
              <article className="gpl-step-card">
                <p className="gpl-step-card__num">01</p>
                <h3>Monitora</h3>
                <p>
                  Placar, minuto, estatísticas e mercado num fluxo contínuo — apresentação digna de
                  sala profissional.
                </p>
              </article>
            </StaggerItem>
            <StaggerItem>
              <article className="gpl-step-card">
                <p className="gpl-step-card__num">02</p>
                <h3>Interpreta</h3>
                <p>
                  Pressão e ritmo viram narrativa por jogo. Você lê o momento antes da linha
                  reagir.
                </p>
              </article>
            </StaggerItem>
            <StaggerItem>
              <article className="gpl-step-card">
                <p className="gpl-step-card__num">03</p>
                <h3>Prioriza</h3>
                <p>
                  Hero, calor e alertas direcionam o olhar — como direção de transmissão da sua
                  operação.
                </p>
              </article>
            </StaggerItem>
          </StaggerReveal>
        </div>
      </section>

      <CurveDivider flip />

      <section id="central" className="gpl-section gpl-section--alt">
        <div className="gpl-wrap gpl-split">
          <ScrollReveal>
            <p className="gpl-eyebrow">Central ao vivo</p>
            <h2 className="gpl-section__title">
              Mesa de comando
              <br />
              para o jogo em curso
            </h2>
            <p className="gpl-section__sub">
              Tipografia nítida, profundidade em camadas e interação suave — inspirado nas melhores
              experiências de dados esportivos e fintech.
            </p>
            <FeatureList
              items={[
                "Escudos oficiais e faceoff em destaque",
                "Demo interativa — clique e explore",
                "Leitura operacional em português institucional",
              ]}
            />
            <Link href="/terminal" className="gpl-btn gpl-btn--primary gpl-section__cta">
              Abrir central
              <ArrowRight className="h-4 w-4" />
            </Link>
          </ScrollReveal>
          <ScrollReveal delay={0.08}>
            <InteractiveTerminalDemo autoRotate={false} />
          </ScrollReveal>
        </div>
      </section>

      <GpiShowcase />

      <CurveDivider />

      <section className="gpl-section gpl-section--alt">
        <div className="gpl-wrap gpl-telegram">
          <ScrollReveal>
            <p className="gpl-eyebrow">Alertas Telegram</p>
            <h2 className="gpl-section__title">O jogo te encontra — mesmo longe da tela</h2>
            <p className="gpl-section__sub">
              Alertas com escudos, GPI e contexto — no tom de um serviço premium, não de bot
              amador.
            </p>
            <FeatureList
              items={[
                "Destaques configuráveis por intensidade",
                "Copy clara para grupos e operações",
                "Integração natural na rotina live",
              ]}
            />
          </ScrollReveal>
          <TelegramMockPremium />
        </div>
      </section>

      <DiffSection />

      <section className="gpl-section gpl-section--alt">
        <div className="gpl-wrap">
          <ScrollReveal className="gpl-section__head">
            <p className="gpl-eyebrow">Perguntas frequentes</p>
            <h2 className="gpl-section__title">Transparência antes de assinar</h2>
          </ScrollReveal>
          <div className="gpl-faq">
            {FAQ.map((f) => (
              <details key={f.q} className="gpl-faq__item">
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <PlansFinale />

      <ScrollReveal>
        <div className="gpl-final-cta">
          <h2>Pronto para operar com clareza?</h2>
          <p>
            Entre na central gratuita ou garanta sua vaga de fundador antes do fechamento do
            lançamento.
          </p>
          <div className="gpl-final-cta__actions">
            <Link href="/cadastro" className="gpl-btn gpl-btn--primary gpl-btn--lg gpl-btn--shine">
              Criar conta grátis
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/terminal" className="gpl-btn gpl-btn--secondary gpl-btn--lg">
              Explorar central
            </Link>
          </div>
        </div>
      </ScrollReveal>

      <footer className="gpl-footer">
        <div className="gpl-wrap">
          <p className="gpl-footer__brand">
            {BRAND.name} · {BRAND.domain}
          </p>
          <p className="gpl-footer__sub">{BRAND.tagline}</p>
          <nav className="gpl-footer__links" aria-label="Links do rodapé">
            <Link href="/terminal">Central</Link>
            <Link href="/precos">Preços</Link>
            <Link href="/entrar">Entrar</Link>
            <Link href="/cadastro">Cadastro</Link>
          </nav>
          <p className="gpl-footer__legal">
            © {year} {BRAND.name}. Plataforma de inteligência esportiva. Não constitui recomendação
            de aposta nem promessa de resultado financeiro.
          </p>
        </div>
      </footer>
    </div>
  );
}
