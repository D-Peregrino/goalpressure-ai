"use client";

import { memo } from "react";

export interface EngineStatusRow {
  id: string;
  name: string;
  score: number;
  status: "ACTIVE" | "WATCH" | "LOW" | "CRITICAL";
  confidence: number;
  relevance: string;
}

const STATUS_LABEL: Record<EngineStatusRow["status"], string> = {
  ACTIVE: "Ativo",
  WATCH: "Observar",
  LOW: "Baixo",
  CRITICAL: "Crítico",
};

function statusClass(s: EngineStatusRow["status"]): string {
  switch (s) {
    case "ACTIVE":
      return "gp-mc-engine__status--active";
    case "CRITICAL":
      return "gp-mc-engine__status--critical";
    case "WATCH":
      return "gp-mc-engine__status--watch";
    default:
      return "gp-mc-engine__status--low";
  }
}

function EngineStatusLiveInner({ engines }: { engines: EngineStatusRow[] }) {
  return (
    <section className="gp-mc-panel gp-mc-engines">
      <header className="gp-mc-panel__head">
        <h2 className="gp-mc-panel__title">Leituras ao vivo</h2>
      </header>
      <ul className="gp-mc-engine__list">
        {engines.map((e) => (
          <li key={e.id} className="gp-mc-engine__row">
            <div className="gp-mc-engine__top">
              <span className="gp-mc-engine__name">{e.name}</span>
              <span className={`gp-mc-engine__status ${statusClass(e.status)}`}>
                {STATUS_LABEL[e.status]}
              </span>
            </div>
            <div className="gp-mc-engine__bar-wrap">
              <div
                className="gp-mc-engine__bar"
                style={{ width: `${Math.min(100, e.score)}%` }}
              />
            </div>
            <div className="gp-mc-engine__meta">
              <span>
                Nível <strong className="tabular-nums">{Math.round(e.score)}</strong>
              </span>
              <span>
                Confiança <strong className="tabular-nums">{Math.round(e.confidence)}</strong>
              </span>
              <span className="gp-mc-engine__rel">{e.relevance}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default memo(EngineStatusLiveInner);
