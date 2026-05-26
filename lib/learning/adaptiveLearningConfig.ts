function parseBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value == null || value.trim() === "") return defaultValue;
  const n = value.trim().toLowerCase();
  return n === "true" || n === "1" || n === "yes";
}

export function getAdaptiveLearningConfig() {
  return {
    enabled: parseBool(process.env.ADAPTIVE_LEARNING_ENABLED, true),
    sandbox: parseBool(process.env.ADAPTIVE_LEARNING_SANDBOX, false),
  };
}

export function isAdaptiveLearningEnabled(): boolean {
  return getAdaptiveLearningConfig().enabled;
}

export const DEFAULT_THRESHOLDS = {
  minContextScore: 62,
  minPredictiveBreak: 58,
  pressureGate: 68,
  autonomousSensitivity: 1,
  predictiveSensitivity: 1,
  decisionConfidenceCap: 92,
} as const;
