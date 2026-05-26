"use client";

import type { ReplayTimelineEvent } from "@/lib/replay/replayTimeline";

export default function ReplayTimeline({
  events,
  currentMinute,
}: {
  events: ReplayTimelineEvent[];
  currentMinute: number;
}) {
  return (
    <section className="gp-replay-panel">
      <header className="gp-replay-panel__head">
        <h3>Replay timeline</h3>
        <p>Eventos contextuais, Telegram e consenso</p>
      </header>
      <ol className="gp-replay-timeline">
        {events.map((event) => (
          <li
            key={event.id}
            className={currentMinute >= event.minute ? "is-past" : ""}
          >
            <span className="gp-replay-timeline__minute">{event.minute}'</span>
            <div>
              <strong>{event.label}</strong>
              <span>{event.kind}</span>
            </div>
          </li>
        ))}
      </ol>
      {!events.length && <p className="gp-replay-empty">Sem eventos para esse replay.</p>}
    </section>
  );
}
