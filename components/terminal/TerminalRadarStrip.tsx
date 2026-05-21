"use client";

import { memo, useMemo } from "react";
import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { TERMINAL_COPY, TOOLTIPS } from "@/lib/ux/sportsLanguage";
import SportsTooltip from "@/components/ui/SportsTooltip";

function TerminalRadarStripInner({ matches }: { matches: EnrichedLiveMatch[] }) {
  const { can } = useSubscription();

  const stats = useMemo(() => {
    const live = matches.filter(
      (m) => m.displayStatus === "LIVE" || m.displayStatus === "HT"
    );
    const avgPressao =
      live.length > 0
        ? live.reduce((s, m) => s + m.chaosIndex, 0) / live.length
        : 0;
    const mercado = live.filter((m) => m.steamMove).length;
    const chances = live.filter((m) => m.evPlus).length;
    const avgVantagem =
      live.length > 0
        ? live.reduce((s, m) => s + (m.edgePercent ?? 0), 0) / live.length
        : 0;
    const maxIntensidade = live.reduce((m, x) => Math.max(m, x.pressureScore), 0);
    return { live: live.length, avgPressao, mercado, chances, avgVantagem, maxIntensidade };
  }, [matches]);

  if (!can("chaos_radar")) {
    return (
      <aside className="gp-desk-radar gp-desk-radar--locked gp-desk-radar--sport">
        <p className="gp-desk-radar__title">{TERMINAL_COPY.radarTitle}</p>
        <p className="gp-desk-radar__sub">Recurso Pro — leitura completa do momento</p>
        <a href="/signup" className="gp-btn gp-btn--secondary gp-btn--sm">
          Testar grátis
        </a>
      </aside>
    );
  }

  return (
    <aside className="gp-desk-radar gp-desk-radar--sport gp-desk-radar--premium">
      <SportsTooltip label={TERMINAL_COPY.radarTitle} tip={TOOLTIPS.pressaoJogo} />
      <div className="gp-desk-radar__grid">
        <div className="gp-desk-radar__cell">
          <span>Ao vivo</span>
          <strong className="tabular-nums">{stats.live}</strong>
        </div>
        <div className="gp-desk-radar__cell gp-desk-radar__cell--hot">
          <span>Pressão do jogo</span>
          <strong className="tabular-nums">{Math.round(stats.avgPressao)}</strong>
        </div>
        <div className="gp-desk-radar__cell">
          <span>Mercado acelerando</span>
          <strong className="tabular-nums">{stats.mercado}</strong>
        </div>
        <div className="gp-desk-radar__cell">
          <span>Chances</span>
          <strong className="tabular-nums">{stats.chances}</strong>
        </div>
        <div className="gp-desk-radar__cell">
          <span>Vantagem média</span>
          <strong className="tabular-nums">{stats.avgVantagem.toFixed(1)}%</strong>
        </div>
        <div className="gp-desk-radar__cell">
          <span>Intensidade máx</span>
          <strong className="tabular-nums">{Math.round(stats.maxIntensidade)}</strong>
        </div>
      </div>
      <div
        className="gp-desk-radar__meter"
        style={{ width: `${Math.min(100, stats.avgPressao)}%` }}
        aria-hidden
      />
    </aside>
  );
}

export default memo(TerminalRadarStripInner);
