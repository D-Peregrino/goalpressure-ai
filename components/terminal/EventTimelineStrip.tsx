"use client";

import { memo } from "react";

function EventTimelineStripInner({ events }: { events: string[] }) {
  if (events.length === 0) return null;

  return (
    <div className="gp-event-timeline">
      <span className="gp-event-timeline__label">Timeline</span>
      <div className="gp-event-timeline__track">
        {events.map((ev) => (
          <span key={ev} className="gp-event-timeline__item">
            {ev}
          </span>
        ))}
      </div>
    </div>
  );
}

export default memo(EventTimelineStripInner);
