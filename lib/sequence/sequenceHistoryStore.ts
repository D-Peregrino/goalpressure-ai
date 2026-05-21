/**
 * Ring buffer de histórico por fixture — alimenta analyzeSequenceMemory().
 */

import type { SequenceHistoryTick } from "@/types/sequence";

const MAX_TICKS_PER_FIXTURE = 32;

interface GlobalSequenceHistorySlot {
  byFixture: Map<string, SequenceHistoryTick[]>;
}

declare global {
  // eslint-disable-next-line no-var
  var __GP_SEQUENCE_HISTORY__: GlobalSequenceHistorySlot | undefined;
}

function getSlot(): GlobalSequenceHistorySlot {
  if (!globalThis.__GP_SEQUENCE_HISTORY__) {
    globalThis.__GP_SEQUENCE_HISTORY__ = { byFixture: new Map() };
  }
  return globalThis.__GP_SEQUENCE_HISTORY__;
}

export function getSequenceHistory(fixtureId: string): SequenceHistoryTick[] {
  return [...(getSlot().byFixture.get(fixtureId) ?? [])];
}

export function appendSequenceHistoryTick(
  fixtureId: string,
  tick: SequenceHistoryTick
): SequenceHistoryTick[] {
  const slot = getSlot();
  const prev = slot.byFixture.get(fixtureId) ?? [];
  const last = prev[prev.length - 1];
  if (last && last.minute === tick.minute) {
    const next = [...prev.slice(0, -1), tick].slice(-MAX_TICKS_PER_FIXTURE);
    slot.byFixture.set(fixtureId, next);
    return next;
  }
  const next = [...prev, tick].slice(-MAX_TICKS_PER_FIXTURE);
  slot.byFixture.set(fixtureId, next);
  return next;
}

export function clearSequenceHistory(fixtureId: string): void {
  getSlot().byFixture.delete(fixtureId);
}
