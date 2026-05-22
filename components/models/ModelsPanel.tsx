"use client";

import modelV1 from "@/config/models/model-v1.json";
import activeManifest from "@/config/models/active-model.json";
import { SIGNAL_DECISION_THRESHOLDS } from "@/lib/engine/signalDecisionEngine";
import { TELEGRAM_COOLDOWN_MS } from "@/lib/telegram/constants";
import { useBacktest } from "@/hooks/useBacktest";
import SportKpiCard from "@/components/ui/sport/SportKpiCard";
import { SportPanel, SportSectionTitle } from "@/components/ui/sport/SportPanel";
import type { QuantitativeModel } from "@/types/model";

export default function ModelsPanel() {
  const model = modelV1 as QuantitativeModel;
  const { snapshot } = useBacktest();
  const activeId = activeManifest.activeModelId;

  const over05 = model.markets.OVER_0_5;
  const over15 = model.markets.OVER_1_5;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SportKpiCard label="Modelo ativo" value={activeId} accent />
        <SportKpiCard
          label="Intensidade mínima"
          value={String(SIGNAL_DECISION_THRESHOLDS.minPressureScore)}
        />
        <SportKpiCard
          label="Valor esperado mín."
          value={String(SIGNAL_DECISION_THRESHOLDS.minEv)}
        />
        <SportKpiCard
          label="Intervalo entre alertas"
          value={`${TELEGRAM_COOLDOWN_MS / 60_000} min`}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <SportPanel>
          <SportSectionTitle>Mais de 0,5 gols — limites</SportSectionTitle>
          <ul className="space-y-1 text-sm text-[rgba(226,232,240,0.9)]">
            <li>Minuto mínimo: {over05.minMinute}</li>
            <li>Minuto máximo: {over05.maxMinute}</li>
            <li>Intensidade mínima: {over05.minPressure}</li>
            <li>Ataques perigosos mín.: {over05.minDangerousAttacks}</li>
            <li>Odd mínima: {over05.minOdd}</li>
          </ul>
        </SportPanel>
        <SportPanel>
          <SportSectionTitle>Mais de 1,5 gols — limites</SportSectionTitle>
          <ul className="space-y-1 text-sm text-[rgba(226,232,240,0.9)]">
            <li>Minuto mínimo: {over15.minMinute}</li>
            <li>Minuto máximo: {over15.maxMinute}</li>
            <li>Intensidade mínima: {over15.minPressure}</li>
            <li>Chutes mínimos: {over15.minShots}</li>
            <li>Ataques perigosos mín.: {over15.minDangerousAttacks}</li>
            <li>Odd mínima: {over15.minOdd}</li>
          </ul>
        </SportPanel>
      </div>

      <SportPanel>
        <SportSectionTitle>Performance histórica (backtest)</SportSectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
          <div>
            <p className="text-xs text-[rgba(148,163,184,0.9)]">Retorno</p>
            <p className="font-semibold tabular-nums text-[#f1f5f9]">
              {snapshot?.roi != null
                ? `${snapshot.roi >= 0 ? "+" : ""}${snapshot.roi.toFixed(2)}u`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-[rgba(148,163,184,0.9)]">Taxa de acerto</p>
            <p className="font-semibold tabular-nums text-[#f1f5f9]">
              {snapshot?.hitRate != null
                ? `${(snapshot.hitRate * 100).toFixed(1)}%`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-[rgba(148,163,184,0.9)]">Registros</p>
            <p className="font-semibold tabular-nums text-[#f1f5f9]">
              {snapshot?.storedResults?.length ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-[rgba(148,163,184,0.9)]">Lucro</p>
            <p className="font-semibold tabular-nums text-[#f1f5f9]">
              {snapshot?.profitUnits != null
                ? snapshot.profitUnits.toFixed(2)
                : "—"}
            </p>
          </div>
        </div>
      </SportPanel>
    </div>
  );
}
