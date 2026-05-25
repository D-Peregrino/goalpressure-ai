import type { DispatchCandidate } from "@/lib/execution/execution.types";

const recentFingerprints = new Map<string, number>();
const DEDUP_WINDOW_MS = 90_000;

export function dispatchFingerprint(c: DispatchCandidate): string {
  return `${c.fixtureId}|${c.market}|${c.signalType}`;
}

export function isDuplicateDispatch(candidate: DispatchCandidate): boolean {
  const fp = dispatchFingerprint(candidate);
  const last = recentFingerprints.get(fp);
  if (last != null && Date.now() - last < DEDUP_WINDOW_MS) return true;
  return false;
}

export function markDispatchSeen(candidate: DispatchCandidate): void {
  recentFingerprints.set(dispatchFingerprint(candidate), Date.now());
}

export function dedupSignals(candidates: DispatchCandidate[]): {
  unique: DispatchCandidate[];
  removed: number;
} {
  const unique: DispatchCandidate[] = [];
  let removed = 0;

  for (const c of candidates) {
    if (isDuplicateDispatch(c)) {
      removed += 1;
      continue;
    }
    markDispatchSeen(c);
    unique.push(c);
  }

  return { unique, removed };
}

export function pruneDedupMemory(): void {
  const now = Date.now();
  for (const [fp, at] of recentFingerprints) {
    if (now - at > DEDUP_WINDOW_MS * 4) recentFingerprints.delete(fp);
  }
}
