import type {
  CollectiveContext,
  NetworkTimelineEntry,
  OperatorProfile,
  SharedSignal,
} from "@/lib/network/network.types";

export interface NetworkDevState {
  signals: SharedSignal[];
  votes: Map<string, { validate: number; useful: number; caution: number }>;
  operators: Map<string, OperatorProfile>;
  collective: Map<string, CollectiveContext>;
  timeline: NetworkTimelineEntry[];
}

declare global {
  // eslint-disable-next-line no-var
  var __GP_NETWORK_DEV__: NetworkDevState | undefined;
}

export function getNetworkDevState(): NetworkDevState {
  if (!globalThis.__GP_NETWORK_DEV__) {
    globalThis.__GP_NETWORK_DEV__ = {
      signals: seedSandboxSignals(),
      votes: new Map(),
      operators: seedSandboxOperators(),
      collective: new Map(),
      timeline: seedSandboxTimeline(),
    };
    recomputeDevCollective(globalThis.__GP_NETWORK_DEV__);
  }
  return globalThis.__GP_NETWORK_DEV__;
}

function seedSandboxOperators(): Map<string, OperatorProfile> {
  const ops: OperatorProfile[] = [
    {
      userId: "sandbox-op-1",
      displayName: "Operador Alpha",
      reputationScore: 88,
      precisionScore: 91,
      anticipationScore: 84,
      participationScore: 76,
      falsePositiveRate: 8,
      reliabilityScore: 90,
      signalsCount: 42,
      votesReceived: 128,
    },
    {
      userId: "sandbox-op-2",
      displayName: "Operador Vega",
      reputationScore: 82,
      precisionScore: 79,
      anticipationScore: 88,
      participationScore: 81,
      falsePositiveRate: 12,
      reliabilityScore: 85,
      signalsCount: 36,
      votesReceived: 97,
    },
    {
      userId: "sandbox-op-3",
      displayName: "Operador Inst.",
      reputationScore: 76,
      precisionScore: 74,
      anticipationScore: 70,
      participationScore: 92,
      falsePositiveRate: 15,
      reliabilityScore: 78,
      signalsCount: 58,
      votesReceived: 110,
    },
  ];
  return new Map(ops.map((o) => [o.userId, o]));
}

function seedSandboxSignals(): SharedSignal[] {
  const now = Date.now();
  return [
    {
      id: "sig-1",
      userId: "sandbox-op-1",
      operatorName: "Operador Alpha",
      fixtureId: "demo-liv-mci",
      matchLabel: "Liverpool × Man City",
      league: "Premier League",
      signalType: "reading",
      body: "Pressão sustentada no terço final — mercado ainda lento.",
      minute: 67,
      pressureScore: 78,
      gpiScore: 76,
      validateCount: 5,
      usefulCount: 8,
      createdAt: new Date(now - 120_000).toISOString(),
    },
    {
      id: "sig-2",
      userId: "sandbox-op-2",
      operatorName: "Operador Vega",
      fixtureId: "demo-liv-mci",
      matchLabel: "Liverpool × Man City",
      league: "Premier League",
      signalType: "rupture",
      body: "Ruptura ofensiva provável — convergência de pressão e GPI.",
      minute: 69,
      pressureScore: 81,
      gpiScore: 79,
      validateCount: 4,
      usefulCount: 6,
      createdAt: new Date(now - 90_000).toISOString(),
    },
    {
      id: "sig-3",
      userId: "sandbox-op-3",
      operatorName: "Operador Inst.",
      fixtureId: "demo-bar-atm",
      matchLabel: "Barcelona × Atlético",
      league: "La Liga",
      signalType: "context",
      body: "Contexto de transição rápida — zona de atenção coletiva.",
      minute: 54,
      pressureScore: 72,
      gpiScore: 68,
      validateCount: 3,
      usefulCount: 5,
      createdAt: new Date(now - 200_000).toISOString(),
    },
  ];
}

function seedSandboxTimeline(): NetworkTimelineEntry[] {
  const now = Date.now();
  return [
    {
      id: "tl-1",
      fixtureId: "demo-liv-mci",
      eventType: "gpi_rise",
      label: "67' — GPI subiu para 76",
      payload: { gpi: 76 },
      createdAt: new Date(now - 180_000).toISOString(),
    },
    {
      id: "tl-2",
      fixtureId: "demo-liv-mci",
      eventType: "watchlist",
      label: "69' — operadores adicionaram watchlist",
      payload: { observers: 4 },
      createdAt: new Date(now - 150_000).toISOString(),
    },
    {
      id: "tl-3",
      fixtureId: "demo-liv-mci",
      eventType: "consensus",
      label: "71' — consenso aumentou para 72",
      payload: { consensus: 72 },
      createdAt: new Date(now - 120_000).toISOString(),
    },
    {
      id: "tl-4",
      fixtureId: "demo-liv-mci",
      eventType: "goal",
      label: "74' — gol — validação contextual",
      payload: {},
      createdAt: new Date(now - 60_000).toISOString(),
    },
  ];
}

function recomputeDevCollective(state: NetworkDevState): void {
  const byFixture = new Map<string, SharedSignal[]>();
  for (const s of state.signals) {
    const list = byFixture.get(s.fixtureId) ?? [];
    list.push(s);
    byFixture.set(s.fixtureId, list);
  }

  state.collective.clear();
  for (const [fixtureId, sigs] of byFixture) {
    const users = new Set(sigs.map((s) => s.userId));
    const avgPressure =
      sigs.reduce((a, s) => a + (s.pressureScore ?? 0), 0) / Math.max(1, sigs.length);
    const observerCount = users.size + 2;
    const consensusScore = Math.min(
      100,
      Math.round(observerCount * 12 + avgPressure * 0.45 + sigs.length * 4)
    );
    state.collective.set(fixtureId, {
      fixtureId,
      matchLabel: sigs[0]!.matchLabel,
      league: sigs[0]!.league,
      observerCount,
      consensusScore,
      collectivePressure: Math.round(avgPressure),
      traits: { signalCount: sigs.length },
      updatedAt: new Date().toISOString(),
    });
  }
}
