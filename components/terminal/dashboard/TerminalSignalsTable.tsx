"use client";

import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import { Badge } from "@/components/ui/badge";

export default function TerminalSignalsTable({ matches }: { matches: EnrichedLiveMatch[] }) {
  const rows = [...matches]
    .sort((a, b) => b.pressureScore - a.pressureScore)
    .slice(0, 16);

  return (
    <div className="gp-bloomberg__card-glow overflow-hidden">
      <div className="border-b border-[#1A222C] px-4 py-3">
        <p className="font-[family-name:var(--font-orbitron)] text-xs font-semibold tracking-wide">
          Operational matrix
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="gp-bloomberg__table">
          <thead>
            <tr>
              <th>Fixture</th>
              <th>Min</th>
              <th>Pressure</th>
              <th>Chaos</th>
              <th>EV</th>
              <th>Momentum</th>
              <th>Odds Δ</th>
              <th>Regime</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-[#F4F7FA]/45 py-8">
                  Sem fixtures ao vivo na SportMonks
                </td>
              </tr>
            ) : (
              rows.map((m) => (
                <tr key={m.fixtureId}>
                  <td>
                    <span className="text-[#F4F7FA]">{m.homeTeam}</span>
                    <span className="text-[#F4F7FA]/40"> vs </span>
                    <span className="text-[#F4F7FA]">{m.awayTeam}</span>
                    <div className="text-[10px] text-[#F4F7FA]/40">{m.league}</div>
                  </td>
                  <td className="gp-bloomberg__mono">{m.minuteLabel}</td>
                  <td className="gp-bloomberg__mono text-[#FF4D4D]">{Math.round(m.pressureScore)}</td>
                  <td className="gp-bloomberg__mono">{Math.round(m.chaosIndex)}</td>
                  <td className="gp-bloomberg__mono">
                    {m.ev != null ? `${(m.ev * 100).toFixed(1)}%` : "—"}
                  </td>
                  <td className="gp-bloomberg__mono">{m.momentum > 0 ? "+" : ""}{m.momentum.toFixed(1)}</td>
                  <td className="gp-bloomberg__mono">
                    {m.edgePercent != null ? `${m.edgePercent.toFixed(1)}%` : "—"}
                  </td>
                  <td>
                    <Badge variant={m.isLive ? "live" : "muted"}>
                      {m.operationalState ?? "NEUTRAL"}
                    </Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
