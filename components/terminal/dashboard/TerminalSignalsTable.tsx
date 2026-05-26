"use client";

import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import { Badge } from "@/components/ui/badge";
import {
  formatPercentDisplay,
  formatSignedDisplay,
  roundDisplay,
  translateRegimeLabel,
} from "@/lib/terminal/formatDisplay";

export default function TerminalSignalsTable({ matches }: { matches: EnrichedLiveMatch[] }) {
  const rows = [...matches]
    .sort((a, b) => b.pressureScore - a.pressureScore)
    .slice(0, 16);

  return (
    <div className="gp-bloomberg__card-glow overflow-hidden">
      <div className="border-b border-[#2A3A52] px-4 py-3">
        <p className="font-[family-name:var(--font-orbitron)] text-xs font-semibold tracking-wide text-[#F4F7FA]">
          Matriz operacional
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="gp-bloomberg__table">
          <thead>
            <tr>
              <th>Jogo</th>
              <th>Min</th>
              <th>Pressão</th>
              <th>Caos</th>
              <th>Valor</th>
              <th>Momento</th>
              <th>Odd Δ</th>
              <th>Regime</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-[#AAB6C5] py-8">
                  Nenhum jogo ao vivo no feed SportMonks
                </td>
              </tr>
            ) : (
              rows.map((m) => (
                <tr key={m.fixtureId}>
                  <td>
                    <span className="text-[#F4F7FA]">{m.homeTeam}</span>
                    <span className="text-[#AAB6C5]"> x </span>
                    <span className="text-[#F4F7FA]">{m.awayTeam}</span>
                    <div className="text-[11px] text-[#AAB6C5]">{m.league}</div>
                  </td>
                  <td className="gp-bloomberg__mono">{m.minuteLabel}</td>
                  <td className="gp-bloomberg__mono text-[#FF4D4D]">
                    {roundDisplay(m.pressureScore)}
                  </td>
                  <td className="gp-bloomberg__mono">{roundDisplay(m.chaosIndex)}</td>
                  <td className="gp-bloomberg__mono">{formatPercentDisplay(m.ev)}</td>
                  <td className="gp-bloomberg__mono">{formatSignedDisplay(m.momentum)}</td>
                  <td className="gp-bloomberg__mono">{formatPercentDisplay(m.edgePercent)}</td>
                  <td>
                    <Badge variant={m.isLive ? "live" : "muted"}>
                      {translateRegimeLabel(m.operationalState)}
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
