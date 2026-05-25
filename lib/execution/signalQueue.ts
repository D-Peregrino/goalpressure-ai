import type {
  DispatchCandidate,
  QueuedDispatch,
} from "@/lib/execution/execution.types";
import {
  classifyDispatchUrgency,
  urgencyRank,
} from "@/lib/execution/urgencyClassifier";
import { operatorRouting } from "@/lib/execution/operatorRouting";

/**
 * Fila operacional com prioridade e rotas.
 */
export function signalQueue(
  candidates: DispatchCandidate[]
): QueuedDispatch[] {
  const now = new Date().toISOString();

  const queued = candidates.map((c) => {
    const { urgency, priorityScore } = classifyDispatchUrgency(c);
    const routes = operatorRouting(c, urgency);
    return {
      ...c,
      urgency,
      priorityScore,
      routes,
      queuedAt: now,
    };
  });

  return queued.sort((a, b) => {
    const u = urgencyRank(b.urgency) - urgencyRank(a.urgency);
    if (u !== 0) return u;
    return b.priorityScore - a.priorityScore;
  });
}
