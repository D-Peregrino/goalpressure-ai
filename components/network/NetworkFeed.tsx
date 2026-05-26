"use client";

import type { NetworkTimelineEntry } from "@/lib/network/network.types";

const EVENT_COLORS: Record<string, string> = {
  gpi_rise: "gpi",
  watchlist: "watch",
  consensus: "consensus",
  rupture: "rupture",
  goal: "goal",
};

export default function NetworkFeed({
  timeline,
  fixtureFilter,
}: {
  timeline: NetworkTimelineEntry[];
  fixtureFilter?: string;
}) {
  const rows = fixtureFilter
    ? timeline.filter((t) => t.fixtureId === fixtureFilter)
    : timeline;

  return (
    <section className="gp-net-panel gp-net-timeline">
      <header className="gp-net-panel__head">
        <h3>Network timeline</h3>
        <p>Telemetria operacional da rede</p>
      </header>
      <ol className="gp-net-timeline__list">
        {rows.slice(0, 20).map((e) => (
          <li key={e.id} className="gp-net-timeline__item">
            <span
              className="gp-net-timeline__dot"
              data-event={EVENT_COLORS[e.eventType] ?? "default"}
            />
            <div>
              <p>{e.label}</p>
              <time dateTime={e.createdAt}>
                {new Date(e.createdAt).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </time>
            </div>
          </li>
        ))}
      </ol>
      {!rows.length && <p className="gp-net-empty">Timeline vazia.</p>}
    </section>
  );
}
