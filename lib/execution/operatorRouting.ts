import type {
  DispatchCandidate,
  DispatchRoute,
  DispatchUrgency,
} from "@/lib/execution/execution.types";

/**
 * Decide canais de distribuição por urgência e contexto.
 */
export function operatorRouting(
  candidate: DispatchCandidate,
  urgency: DispatchUrgency
): DispatchRoute[] {
  const routes: DispatchRoute[] = ["terminal_feed"];

  if (urgency === "CRITICAL" || urgency === "HIGH") {
    routes.push("hero");
  }

  if (urgency === "CRITICAL" || (urgency === "HIGH" && (candidate.evPercent ?? 0) >= 5)) {
    routes.push("telegram");
  }

  if (
    urgency === "CRITICAL" ||
    candidate.temperature === "IGNITE" ||
    (candidate.evPercent ?? 0) >= 8
  ) {
    routes.push("push");
  }

  if (candidate.source === "LEARNING_LAYER" && urgency !== "LOW") {
    if (!routes.includes("telegram")) routes.push("telegram");
  }

  return [...new Set(routes)];
}
