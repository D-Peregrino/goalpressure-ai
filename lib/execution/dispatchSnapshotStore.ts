import type {
  DispatchEngineSnapshot,
  PushNotificationPayload,
} from "@/lib/execution/execution.types";

interface DispatchSlot {
  snapshot: DispatchEngineSnapshot | null;
  pendingPushes: PushNotificationPayload[];
  dispatchTimestamps: number[];
}

declare global {
  // eslint-disable-next-line no-var
  var __GP_DISPATCH__: DispatchSlot | undefined;
}

function getSlot(): DispatchSlot {
  if (!globalThis.__GP_DISPATCH__) {
    globalThis.__GP_DISPATCH__ = {
      snapshot: null,
      pendingPushes: [],
      dispatchTimestamps: [],
    };
  }
  return globalThis.__GP_DISPATCH__;
}

export function setDispatchSnapshot(snapshot: DispatchEngineSnapshot): void {
  const slot = getSlot();
  slot.snapshot = snapshot;
  slot.dispatchTimestamps.push(Date.now());
  if (slot.dispatchTimestamps.length > 200) {
    slot.dispatchTimestamps = slot.dispatchTimestamps.slice(-200);
  }
}

export function getDispatchSnapshot(): DispatchEngineSnapshot | null {
  return getSlot().snapshot;
}

export function enqueuePendingPush(push: PushNotificationPayload): void {
  const slot = getSlot();
  slot.pendingPushes.unshift(push);
  if (slot.pendingPushes.length > 40) {
    slot.pendingPushes = slot.pendingPushes.slice(0, 40);
  }
}

export function consumePendingPushes(max = 10): PushNotificationPayload[] {
  const slot = getSlot();
  const items = slot.pendingPushes.splice(0, max);
  return items;
}

export function getDispatchRatePerHour(): number {
  const slot = getSlot();
  const hourAgo = Date.now() - 3_600_000;
  return slot.dispatchTimestamps.filter((t) => t >= hourAgo).length;
}
