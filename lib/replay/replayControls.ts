export const REPLAY_SPEEDS = [0.5, 1, 2, 4, 8] as const;
export type ReplaySpeed = (typeof REPLAY_SPEEDS)[number];

export interface ReplayControlState {
  isPlaying: boolean;
  speed: ReplaySpeed;
  minute: number;
}

export function clampMinute(minute: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, minute));
}

export function nextMinute(
  minute: number,
  speed: ReplaySpeed,
  bounds: { min: number; max: number }
): number {
  const jump = speed >= 4 ? 2 : 1;
  return clampMinute(minute + jump, bounds.min, bounds.max);
}

export function speedLabel(speed: ReplaySpeed): string {
  return `${speed}x`;
}
