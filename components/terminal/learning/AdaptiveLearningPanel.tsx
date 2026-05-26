"use client";

import { useEffect, useState } from "react";
import type { AdaptiveLearningSnapshot } from "@/lib/learning/adaptiveLearning.types";

export default function AdaptiveLearningPanel() {
  const [data, setData] = useState<AdaptiveLearningSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/autonomous/core", { cache: "no-store" });
        const body = await res.json();
        if (!cancelled && body?.adaptiveLearning) {
          setData(body.adaptiveLearning as AdaptiveLearningSnapshot);
        }
      } catch {
        /* ignore */
      }
    };
    void load();
    const id = window.setInterval(load, 14_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (!data) {
    return (
      <section className="gp-adaptive-learn">
        <p className="gp-adaptive-learn__empty">Carregando aprendizado adaptativo…</p>
      </section>
    );
  }

  const t = data.thresholds;

  return (
    <section className="gp-adaptive-learn">
      <header className="gp-adaptive-learn__head">
        <div>
          <h3 className="gp-adaptive-learn__title">Aprendizado adaptativo</h3>
          <p className="gp-adaptive-learn__sub">
            Calibração contínua a partir de leituras contextuais, preditivas e desfechos
          </p>
        </div>
        <span
          className={`gp-adaptive-learn__pill ${data.metrics.enabled ? "gp-adaptive-learn__pill--on" : ""}`}
        >
          {data.metrics.sandboxMode ? "Sandbox" : data.metrics.enabled ? "Ativo" : "Pausado"}
        </span>
      </header>

      <div className="gp-adaptive-learn__metrics">
        <div>
          <span>Precisão contextual</span>
          <strong>{data.contextualAccuracyPct}%</strong>
        </div>
        <div>
          <span>Precisão preditiva</span>
          <strong>{data.predictiveAccuracyPct}%</strong>
        </div>
        <div>
          <span>Falso positivo</span>
          <strong>{data.falsePositivePct}%</strong>
        </div>
        <div>
          <span>Antecipações válidas</span>
          <strong>{data.validAnticipations}</strong>
        </div>
      </div>

      <div className="gp-adaptive-learn__section">
        <h4>Thresholds atuais</h4>
        <ul className="gp-adaptive-learn__list">
          <li>Contexto mínimo: {t.minContextScore}</li>
          <li>Ruptura preditiva mín.: {t.minPredictiveBreak}</li>
          <li>Pressão mínima: {t.pressureGate}</li>
          <li>Sensibilidade autônoma: {t.autonomousSensitivity.toFixed(2)}</li>
          <li>Teto de confiança: {t.decisionConfidenceCap}%</li>
        </ul>
      </div>

      {data.recentAdjustments.length > 0 ? (
        <div className="gp-adaptive-learn__section">
          <h4>Autoajustes recentes</h4>
          <ul className="gp-adaptive-learn__list">
            {data.recentAdjustments.slice(0, 5).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="gp-adaptive-learn__cols">
        <div>
          <h4>Padrões fortes</h4>
          <ul className="gp-adaptive-learn__list">
            {data.strongPatterns.length === 0 ? (
              <li className="gp-adaptive-learn__muted">Aguardando amostras</li>
            ) : (
              data.strongPatterns.map((p) => (
                <li key={p.id}>
                  <strong>{p.label}</strong> · {p.effectivenessPct}% · {p.frequency}×
                  <br />
                  <span className="gp-adaptive-learn__muted">{p.likelyOutcome}</span>
                </li>
              ))
            )}
          </ul>
        </div>
        <div>
          <h4>Ligas mais confiáveis</h4>
          <ul className="gp-adaptive-learn__list">
            {data.topLeagues.length === 0 ? (
              <li className="gp-adaptive-learn__muted">Aguardando amostras</li>
            ) : (
              data.topLeagues.map((l) => (
                <li key={l.league}>
                  <strong>{l.league}</strong> · score {l.score}
                  <br />
                  <span className="gp-adaptive-learn__muted">{l.label}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      {data.timeline.length > 0 ? (
        <div className="gp-adaptive-learn__section">
          <h4>Evolução da assertividade</h4>
          <div className="gp-adaptive-learn__timeline">
            {data.timeline.slice(0, 8).map((point) => (
              <div key={point.at} className="gp-adaptive-learn__timeline-row">
                <span>{new Date(point.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                <span>Contexto {point.contextualPct}%</span>
                <span>Preditivo {point.predictivePct}%</span>
              </div>
            ))}
          </div>
          <p className="gp-adaptive-learn__note">
            Evolução indicativa — não representa precisão absoluta garantida.
          </p>
        </div>
      ) : null}
    </section>
  );
}
