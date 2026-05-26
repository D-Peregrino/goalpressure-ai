import { buildReplayDataset } from "@/lib/replay/replayEngine";
import type { ReplayDataset } from "@/lib/replay/replayEngine";
import { buildReplayTimeline } from "@/lib/replay/replayTimeline";
import type {
  ReplayAlertPoint,
  ReplayContextPoint,
  ReplayPredictivePoint,
  ReplaySnapshotPoint,
} from "@/lib/replay/replayEngine";

/** ID fixo — nunca persiste no Supabase. */
export const REPLAY_DEMO_FIXTURE_ID = "demo-bahia-coritiba";

export const REPLAY_DEMO_DROPDOWN_LABEL = "Demo · Bahia x Coritiba";

const HOME = "Bahia";
const AWAY = "Coritiba";
const LEAGUE = "Brasileirão";
const MATCH_LABEL = "Bahia × Coritiba";

/** Replay demonstrativo local — apenas visualização. */
export function buildDemoReplayDataset(): ReplayDataset {
  const fixtureId = REPLAY_DEMO_FIXTURE_ID;
  const kickOffAt = new Date("2026-05-20T19:00:00.000Z").toISOString();

  const snapshots: ReplaySnapshotPoint[] = [];
  const contexts: ReplayContextPoint[] = [];
  const predictive: ReplayPredictivePoint[] = [];
  const alerts: ReplayAlertPoint[] = [];

  for (let minute = 0; minute <= 90; minute += 1) {
    const t = new Date(new Date(kickOffAt).getTime() + minute * 60_000).toISOString();
    const pressure =
      minute < 20
        ? 42 + minute * 1.2
        : minute < 55
          ? 58 + (minute - 20) * 0.8
          : minute < 75
            ? 72 + (minute - 55) * 1.4
            : 88 - (minute - 75) * 0.5;

    const homeScore = minute >= 38 ? 1 : 0;
    const awayScore = minute >= 71 ? 1 : 0;

    snapshots.push({
      fixtureId,
      minute,
      league: LEAGUE,
      matchLabel: MATCH_LABEL,
      pressureScore: Math.round(Math.min(95, pressure)),
      momentumScore: Math.round(pressure * 0.85),
      homeTeam: HOME,
      awayTeam: AWAY,
      homeScore,
      awayScore,
      recordedAt: t,
    });

    if (minute % 5 === 0 || minute === 38 || minute === 71) {
      contexts.push({
        fixtureId,
        minute,
        contextScore: Math.round(pressure * 0.9),
        contextLevel: pressure >= 75 ? "CRITICO" : pressure >= 60 ? "ELEVADO" : "MONITORAMENTO",
        alertLevel: pressure >= 70 ? "alto" : null,
        statusOperacional: pressure >= 75 ? "zona_de_ruptura" : "acompanhar",
        narrative:
          minute >= 71
            ? "Convergência ofensiva no segundo tempo — mercado ainda lento na transição."
            : minute >= 38
              ? "Pressão sustentada do Bahia — contexto de gol provável antes do intervalo."
              : "Jogo equilibrado com leitura territorial gradual.",
        recordedAt: t,
      });
    }

    if (minute >= 50 && minute % 7 === 0) {
      predictive.push({
        fixtureId,
        minute,
        predictiveLevel: minute >= 68 ? "ruptura" : "monitor",
        breakProbability: minute >= 68 ? 0.62 : 0.38,
        marketLagScore: minute >= 65 ? 0.58 : 0.32,
        goalPressureProbability: minute >= 68 ? 0.71 : 0.45,
        narrative:
          minute >= 68
            ? "Mercado com defasagem vs. pressão coletiva — EV contextual positivo."
            : "Aceleração ofensiva detectada — atenção em over e BTTS.",
        recordedAt: t,
      });
    }
  }

  alerts.push(
    {
      fixtureId,
      minute: 38,
      alertKind: "gpi_extremo",
      priority: "high",
      headline: "GPI em zona crítica",
      narrative: "Alerta contextual — pressão Bahia 78+",
      contextScore: 76,
      recordedAt: new Date(new Date(kickOffAt).getTime() + 38 * 60_000).toISOString(),
    },
    {
      fixtureId,
      minute: 71,
      alertKind: "telegram_contextual",
      priority: "high",
      headline: "Contexto monitorado coletivamente",
      narrative: "Telegram · consenso operacional elevado",
      contextScore: 82,
      recordedAt: new Date(new Date(kickOffAt).getTime() + 71 * 60_000).toISOString(),
    }
  );

  const timeline = buildReplayTimeline({
    fixtureId,
    kickOffAt,
    snapshots: snapshots.map((s) => ({
      minute: s.minute,
      pressureScore: s.pressureScore,
      recordedAt: s.recordedAt,
    })),
    contexts: contexts.map((c) => ({
      minute: c.minute,
      contextScore: c.contextScore,
      contextLevel: c.contextLevel,
      recordedAt: c.recordedAt,
    })),
    predictive: predictive.map((p) => ({
      minute: p.minute,
      marketLagScore: p.marketLagScore,
      recordedAt: p.recordedAt,
    })),
    alerts: alerts.map((a) => ({
      minute: a.minute,
      headline: a.headline,
      recordedAt: a.recordedAt,
    })),
    network: [
      {
        id: "demo-net-1",
        eventType: "consensus",
        label: "67' — consenso aumentou para 72",
        createdAt: new Date(new Date(kickOffAt).getTime() + 67 * 60_000).toISOString(),
      },
      {
        id: "demo-net-2",
        eventType: "gpi_rise",
        label: "71' — GPI subiu para 81",
        createdAt: new Date(new Date(kickOffAt).getTime() + 71 * 60_000).toISOString(),
      },
    ],
  });

  const dataset = buildReplayDataset({
    fixtureId,
    snapshots,
    contexts,
    predictive,
    alerts,
    timeline,
  })!;

  return {
    ...dataset,
    matchLabel: MATCH_LABEL,
    league: LEAGUE,
    isDemo: true,
  };
}

export function isDemoFixtureId(fixtureId: string): boolean {
  return fixtureId === REPLAY_DEMO_FIXTURE_ID;
}
