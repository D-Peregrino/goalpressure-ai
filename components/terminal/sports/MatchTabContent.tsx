"use client";

import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import {
  evDisplay,
  possessionPair,
  pressurePair,
} from "@/lib/terminal/sportsDisplay";
import { roundDisplay } from "@/lib/terminal/formatDisplay";
import type { MatchTabId } from "./LiveMatchTabs";

const TAB_TITLES: Record<MatchTabId, string> = {
  pre: "Pré-jogo",
  live: "Ao vivo",
  odds: "Odds",
  stats: "Estatísticas",
  players: "Jogadores",
  traits: "Características",
  h2h: "Confronto direto (H2H)",
};

export default function MatchTabContent({ tab, match }: { tab: MatchTabId; match: EnrichedLiveMatch }) {
  return (
    <div className={`gp-sports__tab-panel gp-sports__tab-panel--${tab}`}>
      <h3 className="gp-sports__tab-panel-title">{TAB_TITLES[tab]}</h3>
      <TabBody tab={tab} match={match} />
    </div>
  );
}

function TabBody({ tab, match }: { tab: MatchTabId; match: EnrichedLiveMatch }) {
  switch (tab) {
    case "pre":
      return (
        <ul className="gp-sports__tab-list">
          <li>
            <strong>Status:</strong> {match.isPreMatch ? "Não iniciado" : match.minuteLabel}
          </li>
          <li>
            <strong>Início:</strong> {match.kickoffLabel ?? "Aguardando horário"}
          </li>
          <li>
            <strong>Leitura:</strong> {match.cardInsight || "Aguardando dados de pré-jogo"}
          </li>
        </ul>
      );
    case "live":
      return (
        <>
          <p className="gp-sports__tab-lead">
            {match.displayInsight || match.cardInsight || "Aguardando leitura ao vivo"}
          </p>
          {match.cardInsightSecondary ? (
            <p className="gp-sports__tab-sub">{match.cardInsightSecondary}</p>
          ) : null}
          {match.opsNarrative ? (
            <p className="gp-sports__tab-sub mt-2">
              <strong>Narrativa:</strong> {match.opsNarrative}
            </p>
          ) : null}
        </>
      );
    case "odds":
      if (match.markets.length === 0) {
        return <p className="gp-sports__tab-empty">Aguardando odds</p>;
      }
      return (
        <ul className="gp-sports__tab-list">
          {match.markets.slice(0, 8).map((m) => (
            <li key={m.market}>
              <strong>{m.market}:</strong> {m.odd?.toFixed(2) ?? "—"}
              {m.edge != null ? ` · distorção ${m.edge.toFixed(1)}%` : ""}
            </li>
          ))}
        </ul>
      );
    case "stats":
      return (
        <ul className="gp-sports__tab-list">
          <li>
            <strong>xG:</strong> {roundDisplay(match.xG)}
          </li>
          <li>
            <strong>Finalizações (total):</strong> {match.shots || "—"}
          </li>
          <li>
            <strong>Posse:</strong> {possessionPair(match)}
          </li>
          <li>
            <strong>Pressão ofensiva:</strong> {pressurePair(match)}
          </li>
          <li>
            <strong>Índice de pressão:</strong> {roundDisplay(match.pressureScore)}
          </li>
          <li>
            <strong>Valor esperado:</strong> {evDisplay(match)}
          </li>
        </ul>
      );
    case "players":
      return (
        <p className="gp-sports__tab-empty">
          Escalações e jogadores ainda não disponíveis neste painel. Aguardando dados.
        </p>
      );
    case "traits":
      return (
        <>
          <p className="gp-sports__tab-lead">
            {match.tacticalProfileLabel || "Perfil tático"}
          </p>
          <p className="gp-sports__tab-sub">
            {match.tacticalNarrative || "Aguardando características táticas"}
          </p>
        </>
      );
    case "h2h":
      return (
        <p className="gp-sports__tab-lead">
          {match.dominanceNarrative ||
            match.cardInsightSecondary ||
            "Aguardando histórico de confronto direto"}
        </p>
      );
    default:
      return <p className="gp-sports__tab-empty">Aguardando dados</p>;
  }
}
