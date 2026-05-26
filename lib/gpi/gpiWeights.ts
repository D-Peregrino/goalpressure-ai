/**
 * Pesos institucionais do GoalPressure Index (soma normalizada ≈ 1).
 */
export const GPI_WEIGHTS = {
  pressure: 0.18,
  momentum: 0.1,
  contextual: 0.18,
  predictive: 0.14,
  ev: 0.12,
  adaptive: 0.1,
  autonomous: 0.08,
  territorial: 0.1,
} as const;

export const GPI_RISK_PENALTY_MAX = 14;
