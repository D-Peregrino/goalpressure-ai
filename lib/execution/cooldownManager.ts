import type { DispatchCandidate } from "@/lib/execution/execution.types";

const COOLDOWN_MS = 120_000;

interface CooldownEntry {
  at: number;
}

const cooldownByKey = new Map<string, CooldownEntry>();

export function dispatchCooldownKey(candidate: DispatchCandidate): string {
  return `${candidate.fixtureId}|${candidate.market}|${candidate.signalType}`;
}

export function isOnDispatchCooldown(candidate: DispatchCandidate): boolean {
  const key = dispatchCooldownKey(candidate);
  const entry = cooldownByKey.get(key);
  if (!entry) return false;
  return Date.now() - entry.at < COOLDOWN_MS;
}

export function markDispatchCooldown(candidate: DispatchCandidate): void {
  cooldownByKey.set(dispatchCooldownKey(candidate), { at: Date.now() });
}

export function pruneDispatchCooldowns(): void {
  const now = Date.now();
  for (const [key, entry] of cooldownByKey) {
    if (now - entry.at > COOLDOWN_MS * 3) cooldownByKey.delete(key);
  }
}

export const DISPATCH_COOLDOWN_MS = COOLDOWN_MS;
