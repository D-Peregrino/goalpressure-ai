"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { CopaDataset } from "@/lib/copa/types";

const WATCHED_KEY = "gp_watched_fixtures";

export default function CopaFavorites({ data }: { data: CopaDataset }) {
  const [watched, setWatched] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(WATCHED_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed)) setWatched(parsed);
      }
    } catch {
      setWatched([]);
    }
  }, []);

  const copaIds = new Set(data.liveFixtureIds);
  const allMatches = [...data.today, ...data.calendar.flatMap((d) => d.matches)];
  const favMatches = allMatches.filter(
    (m) => watched.includes(m.fixtureId) || watched.includes(m.matchId) || copaIds.has(m.fixtureId)
  );
  const unique = [...new Map(favMatches.map((m) => [m.fixtureId, m])).values()];

  return (
    <div className="gp-copa-card">
      <p className="gp-copa-card__title">Favoritos</p>
      <p style={{ fontSize: "0.85rem", color: "var(--copa-muted)", margin: "0 0 1rem" }}>
        Sincronizado com o Workspace local. Marque jogos no terminal ou workspace.
      </p>
      {unique.length === 0 ? (
        <p style={{ margin: 0, color: "var(--copa-muted)" }}>
          Nenhum favorito da Copa ainda.{" "}
          <Link href="/workspace">Abrir Workspace</Link>
        </p>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {unique.map((m) => (
            <li key={m.fixtureId} style={{ padding: "0.4rem 0", fontSize: "0.88rem" }}>
              {m.home.name} vs {m.away.name}
              {m.isLive ? " · ao vivo" : ` · ${m.kickoffLabel}`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
