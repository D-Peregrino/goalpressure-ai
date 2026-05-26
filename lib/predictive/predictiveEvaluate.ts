import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import { evaluateMatchContext } from "@/components/terminal/intelligence/ContextEngine";
import { getFixtureWatchState } from "@/lib/autonomous/autonomousMatchWatcher";
import { evaluatePredictiveReading } from "@/lib/predictive/predictiveSignals";
import type { PredictiveReading } from "@/lib/predictive/predictive.types";

/** Avaliação preditiva para UI (sem dependências de servidor). */
export function evaluatePredictiveFromEnriched(match: EnrichedLiveMatch): PredictiveReading {
  const context = evaluateMatchContext(match);
  const watch = getFixtureWatchState(match.fixtureId);
  return evaluatePredictiveReading(match, context, watch);
}
