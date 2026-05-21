/** Rolling window for recent offensive metrics (minutes) */
export const ROLLING_WINDOW_MINUTES = 10;

/** Component weights — sum = 1.0 (quantitative MVP V1) */
export const PRESSURE_WEIGHTS = {
  recentShots: 0.14,
  recentShotsOnTarget: 0.14,
  recentDangerousAttacks: 0.16,
  recentCorners: 0.1,
  offensivePossession: 0.12,
  xgAccumulated: 0.14,
  recentMomentum: 0.1,
  currentOddValue: 0.05,
  offensiveIntensity: 0.05,
} as const;

/** Normalization caps (rolling / cumulative proxies) */
export const PRESSURE_BENCHMARKS = {
  recentShots: 8,
  recentShotsOnTarget: 5,
  recentDangerousAttacks: 18,
  recentCorners: 5,
  possession: 100,
  xg: 2.5,
  momentum: 100,
  oddImplied: 100,
  intensity: 100,
} as const;

/** Minimum pressure delta to treat as stable (anti-spam) */
export const PRESSURE_STABILITY_DELTA = 5;

/** Score → level thresholds */
export const PRESSURE_LEVEL_THRESHOLDS = {
  strongEntry: 80,
  moderateEntry: 70,
  monitor: 60,
} as const;
