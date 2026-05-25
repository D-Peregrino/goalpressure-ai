"use client";

import { useEffect, useState } from "react";
import type { ExecutedDispatch } from "@/lib/execution/execution.types";
import { urgencyLabel } from "@/lib/execution/notificationEngine";

export default function LiveDispatchFeed({ className = "" }: { className?: string }) {
  const [feed, setFeed] = useState<ExecutedDispatch[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/execution/dispatch-feed", { cache: "no-store" });
        const body = await res.json();
        if (!cancelled && body?.snapshot?.feed) {
          setFeed(body.snapshot.feed);
        }
      } catch {
        /* ignore */
      }
    };
    void load();
    const id = window.setInterval(load, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return (
    <section className={`gp-dispatch-feed ${className}`.trim()}>
      <header className="gp-dispatch-feed__head">
        <h2 className="gp-type-title">LIVE DISPATCH FEED</h2>
      </header>
      {feed.length === 0 ? (
        <p className="gp-type-caption text-muted">Fila operacional vazia neste ciclo.</p>
      ) : (
        <ul className="gp-dispatch-feed__list">
          {feed.map((d) => (
            <li
              key={`${d.id}-${d.dispatchedAt}`}
              className={`gp-dispatch-feed__item gp-dispatch-feed__item--${d.urgency.toLowerCase()}`}
            >
              <div className="gp-dispatch-feed__meta">
                <span className="gp-dispatch-feed__urgency">
                  {urgencyLabel(d.urgency)}
                </span>
                <span className="gp-dispatch-feed__routes">
                  {d.routes.join(" · ")}
                </span>
              </div>
              <p className="gp-dispatch-feed__match">{d.matchLabel}</p>
              <p className="gp-dispatch-feed__headline">{d.headline}</p>
              <p className="gp-dispatch-feed__narrative">{d.narrative}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
