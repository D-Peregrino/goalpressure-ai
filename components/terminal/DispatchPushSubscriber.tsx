"use client";

import { useDispatchPush } from "@/hooks/useDispatchPush";

/** Ativa push web para dispatches HIGH/CRITICAL. */
export default function DispatchPushSubscriber() {
  useDispatchPush(true);
  return null;
}
