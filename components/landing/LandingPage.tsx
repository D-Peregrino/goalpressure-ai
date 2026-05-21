"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ChevronRight } from "lucide-react";
import {
  BRAND,
  DETECTIONS,
  PIPELINE,
  ENGINES,
  AUDIENCE,
  PRICING,
} from "@/lib/design/brand";
import { TerminalMock, TerminalCard } from "@/components/ui/terminal";
import ExecutionBadge from "@/components/ui/terminal/ExecutionBadge";
import { terminalFadeUp, terminalStagger } from "@/components/ui/terminal/motion";

export default function LandingPage() {
  return (
    <div className="t-shell overflow-x-hidden">
      <div className="t-ambient" aria-hidden />

      <header className="t-header mx-auto flex max-w-6xl items-center justify-between px-5 py-5 lg:px-8">
        <Link href="/" className="font-display text-xl tracking-tight text-[var(--text)]">
          Goal<span className="t-accent">Pressure</span> AI
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/terminal" className="t-label hidden sm:inline hover:text-[var(--text)]">
            Terminal
          </Link>
          <Link href="/terminal" className="t-btn-primary">
            Entrar no Terminal
            <ArrowRight className="h-4 w-4" />
          </Link>
        </nav>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-24 pt-8 lg:grid lg:grid-cols-2 lg:gap-16 lg:px-8 lg:pt-14">
        <motion.div
          variants={terminalStagger}
          initial="hidden"
          animate="show"
          className="flex flex-col justify-center"
        >
          <motion.p variants={terminalFadeUp} className="t-label mb-4">
            {BRAND.domain}
          </motion.p>
          <motion.h1
            variants={terminalFadeUp}
            className="font-display text-4xl leading-[1.08] sm:text-5xl lg:text-[3rem] text-[var(--text)]"
          >
            {BRAND.tagline}
          </motion.h1>
          <motion.p
            variants={terminalFadeUp}
            className="mt-6 max-w-lg font-body text-base leading-relaxed t-muted"
          >
            {BRAND.subtitle}
          </motion.p>
          <motion.div variants={terminalFadeUp} className="mt-10 flex flex-wrap gap-4">
            <Link href="/terminal" className="t-btn-primary">
              Entrar no Terminal
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/feed" className="t-btn-secondary">
              Ver demonstração
            </Link>
          </motion.div>
        </motion.div>
        <motion.div variants={terminalFadeUp} initial="hidden" animate="show" className="mt-14 lg:mt-0">
          <TerminalMock />
        </motion.div>
      </section>

      <section className="relative z-10 border-y border-[var(--border)] bg-[var(--gp-white-tech)] py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <p className="t-label mb-10">O que o sistema detecta</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {DETECTIONS.map((d) => (
              <div key={d} className="t-card-surface p-5 text-center">
                <p className="font-body text-sm font-medium">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <p className="t-label mb-8">Como funciona</p>
          <div className="flex flex-wrap items-center gap-3 font-mono-data">
            {PIPELINE.map((step, i) => (
              <span key={step} className="flex items-center gap-3">
                <span className="t-card-surface px-4 py-2.5 text-sm font-medium">{step}</span>
                {i < PIPELINE.length - 1 && (
                  <ChevronRight className="h-4 w-4 t-muted" />
                )}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-[var(--border)] bg-[var(--gp-white-tech)] py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <p className="t-label mb-10">Motores do sistema</p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {ENGINES.map((e) => (
              <TerminalCard key={e.id} surface padding="sm">
                <p className="font-display text-base">{e.name}</p>
                <p className="mt-2 font-body text-sm leading-relaxed t-muted">{e.desc}</p>
              </TerminalCard>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <p className="t-label mb-8">Exemplo de sinal institucional</p>
          <div className="t-card t-card--glow max-w-xl p-6 sm:p-8">
            <div className="mb-5 flex flex-wrap justify-between gap-4">
              <div>
                <p className="font-display text-lg">Arsenal vs Chelsea</p>
                <p className="mt-1 font-mono-data text-[var(--text-muted-on-dark)]">
                  Over 0.5 · 67&apos;
                </p>
              </div>
              <ExecutionBadge decision="EXECUTE" />
            </div>
            <div className="grid grid-cols-2 gap-5 font-mono-data sm:grid-cols-4">
              <div>
                <p className="t-label">Pressure</p>
                <p className="mt-1 text-lg font-semibold t-accent">84</p>
              </div>
              <div>
                <p className="t-label">EV</p>
                <p className="mt-1 text-lg font-semibold">+7.2%</p>
              </div>
              <div>
                <p className="t-label">Fair odd</p>
                <p className="mt-1 text-lg font-semibold">1.42</p>
              </div>
              <div>
                <p className="t-label">Confidence</p>
                <p className="mt-1 text-lg font-semibold">72</p>
              </div>
            </div>
            <p className="mt-5 border-t border-white/[0.08] pt-5 font-mono-data text-[var(--text-muted-on-dark)]">
              Grade S · Edge institucional · Consenso quantitativo alinhado
            </p>
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-[var(--border)] bg-[var(--gp-white-tech)] py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <p className="t-label mb-8">Para quem é</p>
          <ul className="grid gap-3 sm:grid-cols-2 font-body text-sm t-muted">
            {AUDIENCE.map((a) => (
              <li key={a} className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF2B2B]" />
                {a}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="relative z-10 py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <p className="t-label mb-10 text-center">Planos</p>
          <div className="grid gap-5 md:grid-cols-3">
            {PRICING.map((p, i) => (
              <div
                key={p.name}
                className={`p-8 text-center ${
                  i === 1 ? "t-card-surface t-card-surface--accent" : "t-card-surface"
                }`}
              >
                <p className="t-label">{p.name}</p>
                <p className="mt-4 font-display text-2xl">{p.price}</p>
                <p className="mt-3 font-body text-sm t-muted">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-[var(--border)] py-24 text-center">
        <div className="mx-auto max-w-xl px-5">
          <h2 className="font-display text-2xl sm:text-3xl">Entre na lista do beta fechado</h2>
          <p className="mt-4 font-body text-sm t-muted">
            Acesso antecipado ao terminal live · vagas limitadas
          </p>
          <Link href="/terminal" className="t-btn-primary mt-10 inline-flex">
            Solicitar acesso
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="relative z-10 border-t border-[var(--border)] bg-[var(--gp-white-tech)] py-10 text-center">
        <p className="t-label">
          {BRAND.name} · {BRAND.domain} · {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
