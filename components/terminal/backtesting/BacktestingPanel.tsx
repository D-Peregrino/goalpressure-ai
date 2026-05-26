"use client";

import { useEffect, useState } from "react";
import type { ContextualBacktestSnapshot } from "@/lib/backtesting/backtest.types";

export default function BacktestingPanel() {
  const [data, setData] = useState<ContextualBacktestSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/autonomous/core", { cache: "no-store" });
        const body = await res.json();
        if (!cancelled && body?.contextualBacktesting) {
          setData(body.contextualBacktesting as ContextualBacktestSnapshot);
        }
      } catch {
        /* ignore */
      }
    };
    void load();
    const id = window.setInterval(load, 18_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (!data) {
    return (
      <section className="gp-ctx-backtest">
        <p className="gp-ctx-backtest__empty">Carregando backtesting contextual…</p>
      </section>
    );
  }

  const moderate = data.scenarios.find((s) => s.scenarioId === "moderado");

  return (
    <section className="gp-ctx-backtest">
      <header className="gp-ctx-backtest__head">
        <div>
          <h3 className="gp-ctx-backtest__title">Backtesting contextual</h3>
          <p className="gp-ctx-backtest__sub">
            Simulação histórica de leituras contextuais, preditivas e decisões operacionais
          </p>
        </div>
        <span
          className={`gp-ctx-backtest__pill ${data.enabled ? "gp-ctx-backtest__pill--on" : ""}`}
        >
          {data.sandboxMode ? "Sandbox" : data.enabled ? "Ativo" : "Pausado"}
        </span>
      </header>

      <p className="gp-ctx-backtest__disclaimer">
        Métricas indicativas sobre amostras históricas. Não representam garantia de desempenho
        futuro nem recomendação de aposta.
      </p>

      <div className="gp-ctx-backtest__metrics">
        <div>
          <span>Assertividade contextual</span>
          <strong>{data.overallAccuracyPct}%</strong>
        </div>
        <div>
          <span>Antecipações válidas</span>
          <strong>{data.validAnticipationRate}%</strong>
        </div>
        <div>
          <span>Falso positivo</span>
          <strong>{data.falsePositiveRate}%</strong>
        </div>
        <div>
          <span>Delay contextual (est.)</span>
          <strong>{data.avgMarketDelayMinutes} min</strong>
        </div>
      </div>

      <div className="gp-ctx-backtest__timing">
        <span>Antecipação média antes do gol (est.)</span>
        <strong>{data.avgMinutesBeforeGoal} min</strong>
      </div>

      {data.scenarios.length > 0 ? (
        <div className="gp-ctx-backtest__section">
          <h4>Cenários</h4>
          <ul className="gp-ctx-backtest__scenario-grid">
            {data.scenarios.map((s) => (
              <li key={s.scenarioId}>
                <span className="gp-ctx-backtest__scenario-name">{s.scenarioLabel}</span>
                <span>Válidas {s.validAnticipationRate}%</span>
                <span>FP {s.falsePositiveRate}%</span>
                <span className="gp-ctx-backtest__muted">{s.samples} amostras</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="gp-ctx-backtest__cols">
        <div>
          <h4>Ligas mais previsíveis</h4>
          <ul className="gp-ctx-backtest__list">
            {data.topLeagues.length === 0 ? (
              <li className="gp-ctx-backtest__muted">Aguardando amostras</li>
            ) : (
              data.topLeagues.map((l) => (
                <li key={l.key}>
                  <strong>{l.label}</strong> · {l.score}% · {l.samples}×
                </li>
              ))
            )}
          </ul>
        </div>
        <div>
          <h4>Padrões mais fortes</h4>
          <ul className="gp-ctx-backtest__list">
            {data.topPatterns.length === 0 ? (
              <li className="gp-ctx-backtest__muted">Aguardando amostras</li>
            ) : (
              data.topPatterns.map((p) => (
                <li key={p.key}>
                  <strong>{p.label}</strong> · {p.score}% · {p.samples}×
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      {data.recentSimulations.length > 0 ? (
        <div className="gp-ctx-backtest__section">
          <h4>Se o sistema estivesse ativo</h4>
          <ul className="gp-ctx-backtest__sim-list">
            {data.recentSimulations.slice(0, 6).map((row) => (
              <li key={`${row.fixtureId}-${row.minute}-${row.action}`}>
                <span className="gp-ctx-backtest__sim-match">{row.matchLabel}</span>
                <span className="gp-ctx-backtest__sim-meta">
                  {row.minute}&apos; · {row.action.replace(/_/g, " ")} · ctx {row.contextScore}
                </span>
                <span
                  className={`gp-ctx-backtest__sim-outcome gp-ctx-backtest__sim-outcome--${row.evaluation}`}
                >
                  {row.evaluation === "valido"
                    ? "Leitura consistente com desfecho"
                    : row.evaluation === "falso_positivo"
                      ? "Sinal sem confirmação posterior"
                      : "Observação neutra"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {data.timeline.length > 0 ? (
        <div className="gp-ctx-backtest__section">
          <h4>Timeline histórica</h4>
          <ul className="gp-ctx-backtest__timeline">
            {data.timeline.slice(0, 8).map((ev) => (
              <li key={`${ev.fixtureId}-${ev.minute}-${ev.action}`} className="gp-ctx-backtest__timeline-row">
                <span>
                  {ev.matchLabel} · {ev.minute}&apos;
                </span>
                <span>
                  {ev.action} · {ev.contextLevel.replace(/_/g, " ")}
                </span>
                <span className={`gp-ctx-backtest__sim-outcome--${ev.outcome}`}>
                  {ev.outcome === "valido" ? "Confirmado" : ev.outcome === "falso_positivo" ? "Não confirmado" : "Neutro"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {moderate ? (
        <p className="gp-ctx-backtest__note">
          Cenário moderado: assertividade contextual {moderate.contextualAccuracyPct}% · delay
          mercado ~{moderate.avgMarketDelayMinutes} min (estimativa).
        </p>
      ) : null}

      {data.calibrationNote ? (
        <p className="gp-ctx-backtest__note gp-ctx-backtest__note--cal">{data.calibrationNote}</p>
      ) : null}
    </section>
  );
}
