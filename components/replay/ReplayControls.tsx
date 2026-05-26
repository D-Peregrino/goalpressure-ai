"use client";

import { Pause, Play } from "lucide-react";
import { REPLAY_SPEEDS, speedLabel, type ReplaySpeed } from "@/lib/replay/replayControls";

export default function ReplayControls({
  minute,
  minMinute,
  maxMinute,
  isPlaying,
  speed,
  onPlayToggle,
  onSpeedChange,
  onSeek,
}: {
  minute: number;
  minMinute: number;
  maxMinute: number;
  isPlaying: boolean;
  speed: ReplaySpeed;
  onPlayToggle: () => void;
  onSpeedChange: (speed: ReplaySpeed) => void;
  onSeek: (minute: number) => void;
}) {
  return (
    <section className="gp-replay-controls">
      <button type="button" className="gp-replay-btn" onClick={onPlayToggle}>
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        {isPlaying ? "Pausar" : "Reproduzir"}
      </button>

      <div className="gp-replay-controls__seek">
        <span>{minMinute}'</span>
        <input
          type="range"
          min={minMinute}
          max={maxMinute}
          value={minute}
          onChange={(e) => onSeek(Number(e.target.value))}
        />
        <span>{maxMinute}'</span>
      </div>

      <div className="gp-replay-controls__speed">
        {REPLAY_SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            className={speed === s ? "active" : ""}
            onClick={() => onSpeedChange(s)}
          >
            {speedLabel(s)}
          </button>
        ))}
      </div>
    </section>
  );
}
