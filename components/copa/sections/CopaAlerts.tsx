"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CopaPremiumGate from "@/components/copa/CopaPremiumGate";
import type { CopaDataset } from "@/lib/copa/types";

interface LiveAlertRow {
  matchId: string;
  home: string;
  away: string;
  headline?: string;
}

export default function CopaAlerts({ data }: { data: CopaDataset }) {
  const [alerts, setAlerts] = useState<LiveAlertRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/live-matches");
        if (!res.ok) return;
        const json = (await res.json()) as {
          ok?: boolean;
          matches?: Array<{
            id: string;
            homeTeam: string;
            awayTeam: string;
            league: string;
            opsIntelligence?: { narrative?: string };
          }>;
        };
        const ids = new Set(data.liveFixtureIds);
        const filtered =
          json.ok && json.matches
            ? json.matches.filter((m) => {
                const league = m.league.toLowerCase();
                const fixtureId = m.id.replace(/^sm-/, "");
                return (
                  ids.has(fixtureId) ||
                  ids.has(m.id) ||
                  league.includes("world cup") ||
                  league.includes("copa")
                );
              })
            : [];
        if (!cancelled) {
          setAlerts(
            filtered.slice(0, 8).map((m) => ({
              matchId: m.id,
              home: m.homeTeam,
              away: m.awayTeam,
              headline: m.opsIntelligence?.narrative,
            }))
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [data.liveFixtureIds]);

  const preview = (
    <div className="gp-copa-card" style={{ opacity: 0.5 }}>
      <p className="gp-copa-card__title">Alertas ao vivo</p>
      <p style={{ margin: 0, fontSize: "0.85rem" }}>Pressão, GPI e sinais em tempo real.</p>
    </div>
  );

  return (
    <CopaPremiumGate feature="copa_telegram" preview={preview}>
      <div className="gp-copa-card">
        <p className="gp-copa-card__title">Alertas ao vivo · Telegram</p>
        <p className="gp-copa-premium-note">
          Receba leituras institucionais da Copa no Telegram. Configure destinos no painel
          administrativo ou na sua conta.
        </p>
        {loading ? (
          <p style={{ color: "var(--copa-muted)" }}>Carregando alertas…</p>
        ) : alerts.length === 0 ? (
          <p style={{ color: "var(--copa-muted)", margin: 0 }}>
            Nenhum alerta ao vivo da Copa no momento.
          </p>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {alerts.map((a) => (
              <li
                key={a.matchId}
                style={{
                  padding: "0.5rem 0",
                  borderBottom: "1px solid var(--copa-border)",
                  fontSize: "0.85rem",
                }}
              >
                <strong>
                  {a.home} vs {a.away}
                </strong>
                {a.headline ? <div style={{ color: "var(--copa-muted)" }}>{a.headline}</div> : null}
              </li>
            ))}
          </ul>
        )}
        <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Link href="/terminal" className="gp-copa-btn gp-copa-btn--primary">
            Terminal ao vivo
          </Link>
          <Link href="/conta" className="gp-copa-btn">
            Conta · Telegram
          </Link>
        </div>
      </div>
    </CopaPremiumGate>
  );
}
