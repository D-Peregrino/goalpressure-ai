/**
 * GoalPressure AI — Premium Design System tokens (UI only).
 */

export const colors = {
  bg: "#050608",
  surface: "#0c1018",
  elevated: "#121a24",
  card: "#161f2a",
  border: "rgba(255, 255, 255, 0.06)",
  borderAccent: "rgba(255, 43, 43, 0.35)",
  text: "#f4f7fa",
  textMuted: "#8b98a8",
  textDim: "#5c6570",
  accent: "#ff2b2b",
  accentGlow: "#ff4d6a",
  cyan: "#3ee8ff",
  emerald: "#34d399",
  amber: "#fbbf24",
  violet: "#a78bfa",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  "2xl": 48,
  "3xl": 64,
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;

export type ExecutionGrade = "D" | "C" | "B" | "A" | "S" | "S+" | "UNGRADED";

export const executionGradeStyles: Record<
  ExecutionGrade,
  { bg: string; text: string; glow: string; label: string }
> = {
  "S+": {
    bg: "rgba(255, 43, 43, 0.22)",
    text: "#ff6b6b",
    glow: "0 0 24px rgba(255, 43, 43, 0.45)",
    label: "S+",
  },
  S: {
    bg: "rgba(255, 77, 106, 0.18)",
    text: "#ff8a8a",
    glow: "0 0 20px rgba(255, 77, 106, 0.35)",
    label: "S",
  },
  A: {
    bg: "rgba(62, 232, 255, 0.12)",
    text: "#3ee8ff",
    glow: "0 0 16px rgba(62, 232, 255, 0.25)",
    label: "A",
  },
  B: {
    bg: "rgba(52, 211, 153, 0.12)",
    text: "#34d399",
    glow: "0 0 12px rgba(52, 211, 153, 0.2)",
    label: "B",
  },
  C: {
    bg: "rgba(251, 191, 36, 0.12)",
    text: "#fbbf24",
    glow: "0 0 10px rgba(251, 191, 36, 0.15)",
    label: "C",
  },
  D: {
    bg: "rgba(92, 101, 112, 0.2)",
    text: "#8b98a8",
    glow: "none",
    label: "D",
  },
  UNGRADED: {
    bg: "rgba(92, 101, 112, 0.15)",
    text: "#5c6570",
    glow: "none",
    label: "—",
  },
};

export type RiskLevel = "SAFE" | "WARNING" | "CRITICAL" | "SATURATED";

export const riskStyles: Record<
  RiskLevel,
  { bg: string; text: string; border: string }
> = {
  SAFE: {
    bg: "rgba(52, 211, 153, 0.1)",
    text: "#34d399",
    border: "rgba(52, 211, 153, 0.3)",
  },
  WARNING: {
    bg: "rgba(251, 191, 36, 0.1)",
    text: "#fbbf24",
    border: "rgba(251, 191, 36, 0.35)",
  },
  CRITICAL: {
    bg: "rgba(255, 43, 43, 0.12)",
    text: "#ff6b6b",
    border: "rgba(255, 43, 43, 0.45)",
  },
  SATURATED: {
    bg: "rgba(255, 43, 43, 0.22)",
    text: "#ff2b2b",
    border: "rgba(255, 43, 43, 0.65)",
  },
};

export const typography = {
  display: "font-sans tracking-tight",
  label: "font-mono text-[10px] uppercase tracking-[0.28em]",
  metric: "font-mono tabular-nums font-bold",
  body: "font-mono text-sm",
} as const;
