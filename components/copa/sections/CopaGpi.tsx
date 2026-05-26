"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CopaPremiumGate from "@/components/copa/CopaPremiumGate";

interface GpiRow {
  matchId: string;
  label: string;
  gpi: number;
  band?: string;
}

export default function CopaGpi() {
  const [rows, setRows] = useState<GpiRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/gpi/live");
        if (!res.ok) return;
        const json = (await res.json()) as {
          snapshot?: {
            readings?: Array<{
              matchId: string;
              matchLabel: string;
              league: string;
              score: number;
              classificationLabel: string;
            }>;
          };
        };
        const readings = json.snapshot?.readings ?? [];
        const filtered = readings.filter((i) => {
          const league = i.league.toLowerCase();
          return (
            league.includes("world cup") ||
            league.includes("copa") ||
            league.includes("fifa")
          );
        });
        if (!cancelled) {
          setRows(
            filtered.slice(0, 12).map((i) => ({
              matchId: i.matchId,
              label: i.matchLabel,
              gpi: i.score,
              band: i.classificationLabel,
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
  }, []);

  const preview = (
    <div className="gp-copa-stat-grid">
      {[72, 58, 81].map((v) => (
        <div key={v} className="gp-copa-stat">
          <div className="gp-copa-stat__value">{v}</div>
          <div className="gp-copa-stat__label">GPI demo</div>
        </div>
      ))}
    </div>
  );

  return (
    <CopaPremiumGate feature="copa_gpi" preview={preview}>
      <div className="gp-copa-card">
        <p className="gp-copa-card__title">GPI da Copa</p>
        <p style={{ fontSize: "0.85rem", color: "var(--copa-muted)", margin: "0 0 1rem" }}>
          Goal Pressure Index filtrado para partidas da Copa — mesma engine do terminal.
        </p>
        {loading ? (
          <p style={{ color: "var(--copa-muted)" }}>Carregando GPI…</p>
        ) : rows.length === 0 ? (
          <p style={{ margin: 0, color: "var(--copa-muted)" }}>
            Sem leituras GPI da Copa ao vivo. Abra o{" "}
            <Link href="/terminal">Terminal</Link> quando houver jogos.
          </p>
        ) : (
          <table className="gp-copa-table">
            <thead>
              <tr>
                <th>Partida</th>
                <th>GPI</th>
                <th>Faixa</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.matchId}>
                  <td>
                    <Link href={`/live/${r.matchId}`}>{r.label}</Link>
                  </td>
                  <td>
                    <strong>{Math.round(r.gpi)}</strong>
                  </td>
                  <td>{r.band ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </CopaPremiumGate>
  );
}
