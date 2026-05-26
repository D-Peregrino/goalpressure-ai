interface ThrottleSlot {
  minute: number;
  at: number;
}

const slots = new Map<string, ThrottleSlot>();

export function shouldPersistFixtureMinute(
  scope: string,
  fixtureId: string,
  minute: number,
  minIntervalMs: number
): boolean {
  const key = `${scope}:${fixtureId}`;
  const now = Date.now();
  const prev = slots.get(key);

  if (prev) {
    const sameMinute = prev.minute === minute;
    const withinInterval = now - prev.at < minIntervalMs;
    if (sameMinute && withinInterval) return false;
  }

  slots.set(key, { minute, at: now });
  return true;
}

export function shouldPersistAlertFingerprint(
  fixtureId: string,
  fingerprint: string,
  minIntervalMs: number
): boolean {
  const key = `alert:${fixtureId}:${fingerprint}`;
  const now = Date.now();
  const prev = slots.get(key);
  if (prev && now - prev.at < minIntervalMs) return false;
  slots.set(key, { minute: 0, at: now });
  return true;
}

export function getThrottleCacheSize(): number {
  return slots.size;
}

export function pruneThrottleCache(maxEntries = 8000): void {
  if (slots.size <= maxEntries) return;
  const entries = [...slots.entries()].sort((a, b) => a[1].at - b[1].at);
  const remove = entries.slice(0, Math.floor(maxEntries * 0.25));
  for (const [k] of remove) slots.delete(k);
}
