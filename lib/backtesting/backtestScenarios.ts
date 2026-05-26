import type { BacktestScenarioId } from "@/lib/backtesting/backtest.types";

export interface BacktestScenarioThresholds {
  id: BacktestScenarioId;
  label: string;
  minContextScore: number;
  minPressure: number;
  minPredictiveBreak: number;
  minConfidence: number;
}

export const BACKTEST_SCENARIOS: BacktestScenarioThresholds[] = [
  {
    id: "agressivo",
    label: "Agressivo",
    minContextScore: 55,
    minPressure: 58,
    minPredictiveBreak: 50,
    minConfidence: 48,
  },
  {
    id: "moderado",
    label: "Moderado",
    minContextScore: 62,
    minPressure: 65,
    minPredictiveBreak: 58,
    minConfidence: 52,
  },
  {
    id: "conservador",
    label: "Conservador",
    minContextScore: 72,
    minPressure: 74,
    minPredictiveBreak: 68,
    minConfidence: 58,
  },
];

export function getScenarioById(id: BacktestScenarioId): BacktestScenarioThresholds {
  return BACKTEST_SCENARIOS.find((s) => s.id === id) ?? BACKTEST_SCENARIOS[1]!;
}
