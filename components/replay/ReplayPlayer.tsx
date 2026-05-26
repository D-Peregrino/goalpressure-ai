"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReplayDataset } from "@/lib/replay/replayEngine";
import { useReplayState } from "@/lib/replay/replayState";
import type { ReplaySpeed } from "@/lib/replay/replayControls";
import ReplayControls from "@/components/replay/ReplayControls";
import ReplayTimeline from "@/components/replay/ReplayTimeline";
import ReplayMatchCard from "@/components/replay/ReplayMatchCard";
import ReplayContextLayer from "@/components/replay/ReplayContextLayer";
import ReplayPressureMap from "@/components/replay/ReplayPressureMap";
import "@/app/styles/replay.css";

interface ReplayApiResponse {
  ok: boolean;
  fixtures: { fixtureId: string; matchLabel: string; league: string; lastMinute: number }[];
  replay: ReplayDataset | null;
  error?: string;
}

export default function ReplayPlayer() {
  const [fixtures, setFixtures] = useState<ReplayApiResponse["fixtures"]>([]);
  const [selectedFixture, setSelectedFixture] = useState<string>("");
  const [dataset, setDataset] = useState<ReplayDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const replay = useReplayState(dataset);

  useEffect(() => {
    async function bootstrap() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/replay");
        const body = (await res.json()) as ReplayApiResponse;
        if (!res.ok || !body.ok) {
          setError(body.error ?? "Falha ao carregar replay.");
          return;
        }
        setFixtures(body.fixtures ?? []);
        setDataset(body.replay);
        if (body.replay?.fixtureId) setSelectedFixture(body.replay.fixtureId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro de rede");
      } finally {
        setLoading(false);
      }
    }
    void bootstrap();
  }, []);

  async function loadFixture(fixtureId: string) {
    setSelectedFixture(fixtureId);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/replay?fixtureId=${encodeURIComponent(fixtureId)}`);
      const body = (await res.json()) as ReplayApiResponse;
      if (!res.ok || !body.ok) {
        setError(body.error ?? "Falha ao carregar replay.");
        return;
      }
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
        <label className="gp-replay-select">
          Partida
          <select
            value={selectedFixture}
            onChange={(e) => void loadFixture(e.target.value)}
            disabled={!fixtures.length}
          >
            {fixtures.map((fixture) => (
              <option key={fixture.fixtureId} value={fixture.fixtureId}>
                {fixture.matchLabel} · {fixture.league}
              </option>
            ))}
          </select>
        </label>
      </header>

      {loading && <p className="gp-replay-empty">Carregando replay...</p>}
      {error && <p className="gp-replay-empty">{error}</p>}
      {!loading && !dataset && <p className="gp-replay-empty">Sem snapshots históricos.</p>}

      {dataset && (
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
