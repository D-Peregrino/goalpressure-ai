"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReplayDataset } from "@/lib/replay/replayEngine";
import {
  buildDemoReplayDataset,
  isDemoFixtureId,
  REPLAY_DEMO_DROPDOWN_LABEL,
  REPLAY_DEMO_FIXTURE_ID,
} from "@/lib/replay/replayDemo";
import { useReplayState } from "@/lib/replay/replayState";
import type { ReplaySpeed } from "@/lib/replay/replayControls";
import ReplayControls from "@/components/replay/ReplayControls";
import ReplayTimeline from "@/components/replay/ReplayTimeline";
import ReplayMatchCard from "@/components/replay/ReplayMatchCard";
import ReplayContextLayer from "@/components/replay/ReplayContextLayer";
import ReplayPressureMap from "@/components/replay/ReplayPressureMap";
import ReplayEmptyState from "@/components/replay/ReplayEmptyState";
import "@/app/styles/replay.css";

interface ReplayFixtureOption {
  fixtureId: string;
  matchLabel: string;
  league: string;
  lastMinute: number;
  isDemo?: boolean;
}

interface ReplayApiResponse {
  ok: boolean;
  fixtures: ReplayFixtureOption[];
  replay: ReplayDataset | null;
  empty?: boolean;
  reason?: string;
  demoAvailable?: boolean;
  error?: string;
}

const DEMO_FIXTURE: ReplayFixtureOption = {
  fixtureId: REPLAY_DEMO_FIXTURE_ID,
  matchLabel: REPLAY_DEMO_DROPDOWN_LABEL,
  league: "Demonstração visual",
  lastMinute: 90,
  isDemo: true,
};

export default function ReplayPlayer() {
  const [fixtures, setFixtures] = useState<ReplayFixtureOption[]>([]);
  const [selectedFixture, setSelectedFixture] = useState<string>("");
  const [dataset, setDataset] = useState<ReplayDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEmpty, setIsEmpty] = useState(false);
  const [demoAvailable, setDemoAvailable] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const replay = useReplayState(dataset);

  const dropdownOptions = useMemo(() => {
    if (isDemoMode) return [DEMO_FIXTURE];
    return fixtures;
  }, [fixtures, isDemoMode]);

  const activateDemo = useCallback(() => {
    const demo = buildDemoReplayDataset();
    setIsDemoMode(true);
    setIsEmpty(false);
    setError(null);
    setFixtures([]);
    setSelectedFixture(REPLAY_DEMO_FIXTURE_ID);
    setDataset(demo);
  }, []);

  useEffect(() => {
    async function bootstrap() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/replay");
        const body = (await res.json()) as ReplayApiResponse;
        if (!res.ok || !body.ok) {
          setError(body.error ?? "Não foi possível carregar o replay agora.");
          return;
        }
        setDemoAvailable(body.demoAvailable ?? true);
        setFixtures(body.fixtures ?? []);

        if (body.empty || !body.replay) {
          setIsEmpty(true);
          setDataset(null);
          setSelectedFixture("");
          return;
        }

        setIsEmpty(false);
        setIsDemoMode(false);
        setDataset(body.replay);
        setSelectedFixture(body.replay.fixtureId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro de rede");
      } finally {
        setLoading(false);
      }
    }
    void bootstrap();
  }, []);

  async function loadFixture(fixtureId: string) {
    if (isDemoFixtureId(fixtureId)) {
      activateDemo();
      return;
    }

    setSelectedFixture(fixtureId);
    setIsDemoMode(false);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/replay?fixtureId=${encodeURIComponent(fixtureId)}`);
      const body = (await res.json()) as ReplayApiResponse;
      if (!res.ok || !body.ok) {
        setError(body.error ?? "Não foi possível carregar o replay agora.");
        return;
      }
      if (body.empty || !body.replay) {
        setIsEmpty(true);
        setDataset(null);
        return;
      }
      setIsEmpty(false);
      setDataset(body.replay);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro de rede");
    } finally {
      setLoading(false);
    }
  }

  const timelineEvents = useMemo(() => {
    if (!dataset) return [];
    return dataset.frames.flatMap((f) => f.timeline);
  }, [dataset]);

  const showPlayer = Boolean(dataset) && !loading;
  const showEmpty = !loading && !error && isEmpty && !dataset;

  return (
    <div className="gp-replay">
      <header className="gp-replay-hero">
        <div>
          <p className="gp-replay-hero__eyebrow">GoalPressure Replay Engine</p>
          <h2>Playback histórico operacional</h2>
          <p>
            Replay cinematográfico com GPI, pressão, consenso, Telegram e narrativa contextual.
          </p>
        </div>
        {(showPlayer || isDemoMode) && (
          <label className="gp-replay-select">
            Partida
            <select
              value={selectedFixture}
              onChange={(e) => {
                if (isDemoFixtureId(e.target.value)) {
                  activateDemo();
                } else {
                  void loadFixture(e.target.value);
                }
              }}
            >
              {dropdownOptions.map((fixture) => (
                <option key={fixture.fixtureId} value={fixture.fixtureId}>
                  {fixture.isDemo ? fixture.matchLabel : `${fixture.matchLabel} · ${fixture.league}`}
                </option>
              ))}
            </select>
          </label>
        )}
      </header>

      {isDemoMode && dataset?.isDemo && (
        <div className="gp-replay-demo-banner" role="status">
          <strong>Demonstração visual</strong>
          <span>Dados locais de exemplo — não misturados com histórico real.</span>
        </div>
      )}

      {loading && (
        <p className="gp-replay-status">Preparando replay…</p>
      )}

      {error && (
        <p className="gp-replay-status gp-replay-status--warn" role="alert">
          {error}
        </p>
      )}

      {showEmpty && (
        <ReplayEmptyState onShowDemo={activateDemo} />
      )}

      {showPlayer && dataset && (
        <>
          <ReplayControls
            minute={replay.minute}
            minMinute={dataset.minMinute}
            maxMinute={dataset.maxMinute}
            isPlaying={replay.isPlaying}
            speed={replay.speed}
            onPlayToggle={() => replay.setIsPlaying((v) => !v)}
            onSeek={replay.setMinute}
            onSpeedChange={(s) => replay.setSpeed(s as ReplaySpeed)}
          />

          <div className="gp-replay-grid">
            <div className="gp-replay-main">
              <ReplayMatchCard frame={replay.frame} />
              <ReplayPressureMap dataset={dataset} currentMinute={replay.minute} />
              <ReplayContextLayer frame={replay.frame} />
            </div>
            <div className="gp-replay-side">
              <ReplayTimeline events={timelineEvents} currentMinute={replay.minute} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
