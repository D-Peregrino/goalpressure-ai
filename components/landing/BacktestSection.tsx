"use client";

import Link from "next/link";
import { TerminalCard } from "@/components/ui/terminal";
import ExecutionBadge from "@/components/ui/terminal/ExecutionBadge";

export default function BacktestSection() {
  return (
    <section className="gp-landing-section">
      <div className="gp-landing-container gp-landing-container--split">
        <div>
          <p className="gp-landing-eyebrow">Backtesting institucional</p>
          <h2 className="gp-landing-section__title">
            Validação histórica antes de executar
          </h2>
          <p className="mt-4 max-w-md font-body text-sm leading-relaxed text-[var(--muted)]">
            Calibre edge, EV e janelas de execução com dados reais. O terminal live
            alimenta o mesmo pipeline de decisão usado no backtest.
          </p>
          <Link href="/backtest" className="gp-btn gp-btn--secondary mt-8 inline-flex">
            Abrir Backtest
          </Link>
        </div>
        <TerminalCard glow className="max-w-md">
          <div className="mb-5 flex flex-wrap justify-between gap-4">
            <div>
              <p className="font-display text-lg">Partida ao vivo · SportMonks</p>
              <p className="mt-1 font-mono-data text-sm text-[var(--text-muted-on-dark)]">
                Over 0.5 · janela calibrada
              </p>
            </div>
            <ExecutionBadge decision="EXECUTE" />
          </div>
          <div className="grid grid-cols-2 gap-4 font-mono-data sm:grid-cols-4">
            {[
              ["Pressure", "84"],
              ["EV", "+7.2%"],
              ["Fair odd", "1.42"],
              ["Confidence", "72"],
            ].map(([l, v]) => (
              <div key={l}>
                <p className="t-label">{l}</p>
                <p className="mt-1 text-lg font-semibold t-accent">{v}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 border-t border-white/[0.08] pt-5 font-mono-data text-sm text-[var(--text-muted-on-dark)]">
            Grade S · Edge institucional · Consenso alinhado
          </p>
        </TerminalCard>
      </div>
    </section>
  );
}
