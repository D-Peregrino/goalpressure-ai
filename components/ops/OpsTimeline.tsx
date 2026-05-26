"use client";

import type { OpsTimelineEvent } from "@/lib/ops/opsCenter.types";

const KIND_LABEL: Record<OpsTimelineEvent["kind"], string> = {
  gpi: "GPI",
  pressure: "Pressão",
  telegram: "Telegram",
  consensus: "Consenso",
  goal: "Gol",
  network: "Rede",
  market: "Mercado",
};

export default function OpsTimeline({ events }: { events: OpsTimelineEvent[] }) {
  return (
    <section className="gp-ops-panel gp-ops-timeline">
      <header className="gp-ops-panel__head">
        <h3>Timeline global</h3>
        <p>Feed único do sistema — GPI, pressão, Telegram, consenso</p>
      </header>
      <ol className="gp-ops-timeline__list">
        {events.map((e) => (
          <li key={e.id} className="gp-ops-timeline__item" data-severity={e.severity}>
            <span className="gp-ops-timeline__kind">{KIND_LABEL[e.kind]}</span>
            <div>
              <p>{e.label}</p>
              <time dateTime={e.at}>
                {new Date(e.at).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </time>
            </div>
          </li>
        ))}
      </ol>
      {!events.length && <p className="gp-ops-empty">Timeline aguardando eventos.</p>}
    </section>
  );
}
