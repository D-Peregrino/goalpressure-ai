"use client";

import { useEffect, useRef } from "react";

/**
 * Push engine — notificações web quando permissão concedida.
 */
export function useDispatchPush(enabled = true) {
  const seen = useRef(new Set<string>());

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    if (!("Notification" in window)) return;

    let cancelled = false;

    const poll = async () => {
      try {
        if (Notification.permission === "default") {
          await Notification.requestPermission().catch(() => undefined);
        }
        if (Notification.permission !== "granted") return;

        const res = await fetch("/api/execution/dispatch-feed", { cache: "no-store" });
        const body = await res.json();
        const pushes = body?.pendingPushes ?? [];

        for (const p of pushes) {
          if (cancelled || seen.current.has(p.id)) continue;
          seen.current.add(p.id);
          if (p.urgency !== "CRITICAL" && p.urgency !== "HIGH") continue;

          new Notification(p.title, {
            body: p.body,
            tag: p.fixtureId,
          });
        }
      } catch {
        /* ignore */
      }
    };

    void poll();
    const id = window.setInterval(poll, 25_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled]);
}
