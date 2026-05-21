"use client";

import { memo, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useMatchCenter } from "@/hooks/useMatchCenter";
import MatchCenterHeader from "@/components/match-center/MatchCenterHeader";
import MatchStoryBlock from "@/components/match-center/MatchStoryBlock";
import EmotionalTimeline from "@/components/match-center/EmotionalTimeline";
import VisualOffensiveRadar from "@/components/match-center/VisualOffensiveRadar";
import EngineStatusLive, {
  type EngineStatusRow,
} from "@/components/match-center/EngineStatusLive";
import ExecutionCenterPanel from "@/components/match-center/ExecutionCenterPanel";
import LiveOddsMovement from "@/components/match-center/LiveOddsMovement";
import MatchCenterTips from "@/components/match-center/MatchCenterTips";
import MatchCenterMobileShell, {
  type MatchCenterTab,
} from "@/components/match-center/MatchCenterMobileShell";
import { resolveOddPair } from "@/lib/signals/executionWindow";
import {
  buildMatchStories,
  headlineDoJogo,
  primaryStory,
} from "@/lib/match/matchStorytelling";

function buildEngineRows(
  chaos: number,
  temporalPhase: string | undefined,
  sequenceState: string | null,
  validationScore: number,
  edgePercent: number,
  playerGk: number,
  microScore: number
): EngineStatusRow[] {
  return [
    {
      id: "chaos",
      name: "Pressão do jogo",
      score: chaos,
      status: chaos >= 65 ? "CRITICAL" : chaos >= 40 ? "ACTIVE" : "WATCH",
      confidence: Math.min(100, chaos + 10),
      relevance: "Ritmo e sequências de ataque",
    },
    {
      id: "temporal",
      name: "Fase do jogo",
      score: temporalPhase ? 72 : 40,
      status: temporalPhase?.includes("CRITICAL") ? "CRITICAL" : "ACTIVE",
      confidence: 68,
      relevance: temporalPhase ?? "Aguardando fase",
    },
    {
      id: "sequence",
      name: "Memória de ritmo",
      score: sequenceState === "ESCALATING" ? 78 : 45,
      status: sequenceState === "ESCALATING" ? "ACTIVE" : "WATCH",
      confidence: 62,
      relevance: sequenceState ?? "Estável",
    },
    {
      id: "validation",
      name: "Confiança do modelo",
      score: validationScore,
      status: validationScore >= 65 ? "ACTIVE" : validationScore < 45 ? "LOW" : "WATCH",
      confidence: validationScore,
      relevance: "Consistência da leitura",
    },
    {
      id: "market",
      name: "Calibração de mercado",
      score: Math.min(100, edgePercent * 5),
      status: edgePercent >= 10 ? "ACTIVE" : edgePercent >= 4 ? "WATCH" : "LOW",
      confidence: Math.min(100, 50 + edgePercent * 2),
      relevance: "Odds ao vivo",
    },
    {
      id: "player",
      name: "Impacto do goleiro",
      score: playerGk,
      status: playerGk >= 60 ? "ACTIVE" : "WATCH",
      confidence: 55,
      relevance: "Resistência defensiva",
    },
    {
      id: "micro",
      name: "Momento quente",
      score: microScore,
      status: microScore >= 60 ? "ACTIVE" : "WATCH",
      confidence: microScore,
      relevance: "Picos de ataque",
    },
  ];
}

function MatchCenterPremiumInner({ fixtureId }: { fixtureId: string }) {
  const mc = useMatchCenter(fixtureId);
  const [mobileTab, setMobileTab] = useState<MatchCenterTab>("overview");

  const storyInput = useMemo(() => {
    if (!mc.match) return null;
    return {
      homeTeam: mc.match.homeTeam,
      awayTeam: mc.match.awayTeam,
      homePressure: mc.pressure?.homePressure ?? 50,
      awayPressure: mc.pressure?.awayPressure ?? 50,
      pressureScore: mc.pressure?.pressureScore ?? mc.match.pressure.score,
      momentum: mc.momentum,
      chaosIndex: mc.chaosIndex,
      steamMove: mc.topEdge?.steamMove ?? false,
      steamDirection: mc.operational.steamDirection,
      oddsDrift: mc.topEdge?.oddsDrift ?? null,
      operationalState: mc.operational.state,
      edgePercent: mc.topEdge?.edgePercent ?? null,
      temporalPhase: mc.temporal?.matchPhase,
      sequenceState: mc.sequence?.sequenceState ?? null,
      microeventScore: mc.microevent?.microeventScore,
      minute: mc.match.minute,
    };
  }, [mc]);

  const stories = useMemo(
    () => (storyInput ? buildMatchStories(storyInput) : []),
    [storyInput]
  );

  const headline = useMemo(
    () => (storyInput ? headlineDoJogo(storyInput) : ""),
    [storyInput]
  );

  const engines = useMemo(
    () =>
      mc.match
        ? buildEngineRows(
            mc.chaosIndex,
            mc.temporal?.matchPhase,
            mc.sequence?.sequenceState ?? null,
            mc.validationScore,
            mc.topEdge?.edgePercent ?? 0,
            mc.playerGk?.value ?? 0,
            mc.microevent?.microeventScore ?? 0
          )
        : [],
    [mc]
  );

  const oddsRows = useMemo(() => {
    return mc.sortedEdges.map((e) => {
      const pair = resolveOddPair(e.marketOdd, e.oddsDrift ?? null);
      return {
        market: e.market.replace(/_/g, " "),
        odd: pair.currentOdd ?? e.marketOdd ?? 1,
        previousOdd: pair.previousOdd,
        edge: e.edgePercent,
        steam: e.steamMove,
        drift: e.oddsDrift,
      };
    });
  }, [mc.sortedEdges]);

  if (mc.feedStatus === "loading" && !mc.match) {
    return (
      <div className="gp-mc gp-mc--loading">
        <p className="gp-mc-loading">Entrando na transmissão ao vivo…</p>
      </div>
    );
  }

  if (!mc.match || !mc.core || !storyInput) {
    return (
      <div className="gp-mc gp-mc--empty">
        <p>Jogo fora do feed ao vivo no momento.</p>
        <Link href="/terminal" className="gp-btn gp-btn--secondary mt-4 inline-flex">
          <ArrowLeft className="h-4 w-4" /> Voltar à central
        </Link>
      </div>
    );
  }

  const isLive =
    mc.core.displayStatus === "LIVE" || mc.core.displayStatus === "HT";

  const header = (
    <MatchCenterHeader
      core={mc.core}
      league={mc.match.league}
      pressureScore={mc.pressure?.pressureScore ?? mc.match.pressure.score}
      headline={headline}
      operationalState={mc.operational.state}
      steamMove={mc.topEdge?.steamMove ?? false}
      isLive={isLive}
    />
  );

  const storyBlock = (
    <MatchStoryBlock primary={primaryStory(storyInput)} lines={stories} />
  );

  const timeline = (
    <EmotionalTimeline events={mc.timeline} currentMinute={mc.match.minute} />
  );

  const radar = (
    <VisualOffensiveRadar
      match={mc.match}
      homePressure={mc.pressure?.homePressure ?? 50}
      awayPressure={mc.pressure?.awayPressure ?? 50}
      momentum={mc.momentum}
      chaosIndex={mc.chaosIndex}
      territorialDominance={mc.territorial?.territorialDominance ?? 0}
      attackWaveIntensity={mc.attackWave?.attackWaveIntensity ?? 0}
      pressureHistory={mc.pressureHistory}
      pressureScore={mc.pressure?.pressureScore ?? mc.match.pressure.score}
    />
  );

  const enginePanel = <EngineStatusLive engines={engines} />;
  const execPanel = <ExecutionCenterPanel best={mc.bestExecution} />;
  const oddsPanel = <LiveOddsMovement rows={oddsRows} />;
  const tips = <MatchCenterTips />;

  const overviewDesktop = (
    <>
      {radar}
      {enginePanel}
    </>
  );

  return (
    <div className="gp-mc gp-mc--story">
      <div className="gp-mc__ambient" aria-hidden />

      {header}
      {storyBlock}
      <div className="hidden lg:block">{tips}</div>

      <div className="gp-mc__desktop hidden lg:grid">
        <div className="gp-mc__main">
          {timeline}
          <div className="gp-mc__split">
            {overviewDesktop}
          </div>
          {oddsPanel}
        </div>
        <div className="gp-mc__rail">
          {execPanel}
        </div>
      </div>

      <MatchCenterMobileShell
        activeTab={mobileTab}
        onTab={setMobileTab}
        panels={{
          overview: (
            <>
              {storyBlock}
              {radar}
              {execPanel}
            </>
          ),
          timeline,
          radar,
          engines: enginePanel,
          execute: execPanel,
          odds: oddsPanel,
        }}
      />
    </div>
  );
}

export default memo(MatchCenterPremiumInner);
