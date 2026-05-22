/**
 * Match Story Visualization — traduz leitura tática em tema visual e copy ao vivo.
 * Somente UX; não altera engines.
 */

import type { TacticalProfile, VolatilityProfile } from "@/lib/tactical/tacticalMatchReader";
import type { OffensiveControlSide } from "@/lib/tactical/tacticalMatchReader";

export interface TacticalVisualTheme {
  slug: string;
  pulse: "none" | "slow" | "normal" | "fast" | "chaotic";
  /** Classe modificadora no card / match center */
  mood: "calm" | "control" | "chaos" | "trap" | "counter" | "pressure" | "expectation";
  heatAccent: string;
  glowHome: number;
  glowAway: number;
  dimSide?: "home" | "away";
  pulseSide?: "home" | "away";
  diagonal?: boolean;
  multiZone?: boolean;
}

export interface MatchStoryVisualInput {
  tacticalProfile: TacticalProfile;
  tacticalNarrative: string;
  tacticalIntensity: number;
  emotionalTemperature: number;
  transitionRisk: number;
  volatilityProfile: VolatilityProfile;
  offensiveControl: OffensiveControlSide;
  confidence: number;
  homeTeam: string;
  awayTeam: string;
  homePressure: number;
  awayPressure: number;
  momentum: number;
  isPreMatch?: boolean;
}

export interface LiveStoryHeadline {
  title: string;
  subtitle: string;
}

export interface TemperatureFeel {
  key: "emotion" | "volatility" | "goalRisk" | "pace";
  label: string;
  feel: string;
  level: number;
}

const PROFILE_THEMES: Record<TacticalProfile, TacticalVisualTheme> = {
  TERRITORIAL_DOMINANCE: {
    slug: "territorial",
    pulse: "slow",
    mood: "control",
    heatAccent: "linear-gradient(90deg, rgba(59,130,246,0.5), rgba(34,197,94,0.35))",
    glowHome: 0.85,
    glowAway: 0.35,
    pulseSide: "home",
  },
  OPEN_EXCHANGE: {
    slug: "open",
    pulse: "chaotic",
    mood: "chaos",
    heatAccent: "linear-gradient(120deg, #ff2b2b, #fbbf24, #c084fc, #ff2b2b)",
    glowHome: 0.75,
    glowAway: 0.75,
    multiZone: true,
  },
  FAVORITE_TRAPPED: {
    slug: "trapped",
    pulse: "fast",
    mood: "trap",
    heatAccent: "linear-gradient(90deg, rgba(30,41,59,0.6), rgba(255,43,43,0.45))",
    glowHome: 0.25,
    glowAway: 0.9,
    dimSide: "home",
    pulseSide: "away",
  },
  DANGEROUS_COUNTER: {
    slug: "counter",
    pulse: "fast",
    mood: "counter",
    heatAccent: "linear-gradient(135deg, transparent 40%, rgba(251,146,60,0.55) 50%, transparent 60%)",
    glowHome: 0.4,
    glowAway: 0.85,
    diagonal: true,
    pulseSide: "away",
  },
  HIGH_PRESSURE: {
    slug: "pressure",
    pulse: "normal",
    mood: "pressure",
    heatAccent: "linear-gradient(90deg, rgba(255,43,43,0.55), rgba(255,43,43,0.15))",
    glowHome: 0.7,
    glowAway: 0.7,
  },
  TRANSITION_THREAT: {
    slug: "transition",
    pulse: "fast",
    mood: "counter",
    heatAccent: "linear-gradient(135deg, rgba(251,146,60,0.4), transparent 55%, rgba(59,130,246,0.35))",
    glowHome: 0.45,
    glowAway: 0.8,
    diagonal: true,
  },
  EMOTIONAL_SWING: {
    slug: "emotional",
    pulse: "chaotic",
    mood: "chaos",
    heatAccent: "linear-gradient(90deg, #f472b6, #ff2b2b, #fbbf24)",
    glowHome: 0.65,
    glowAway: 0.65,
    multiZone: true,
  },
  STERILE_POSSESSION: {
    slug: "sterile",
    pulse: "slow",
    mood: "control",
    heatAccent: "linear-gradient(90deg, rgba(148,163,184,0.35), rgba(59,130,246,0.2))",
    glowHome: 0.7,
    glowAway: 0.3,
    dimSide: "away",
  },
  PRESSURE_WITHOUT_FINISHING: {
    slug: "no-finish",
    pulse: "normal",
    mood: "trap",
    heatAccent: "linear-gradient(90deg, rgba(59,130,246,0.4), rgba(148,163,184,0.25))",
    glowHome: 0.75,
    glowAway: 0.35,
    dimSide: "away",
  },
  EFFECTIVE_LOW_BLOCK: {
    slug: "low-block",
    pulse: "slow",
    mood: "trap",
    heatAccent: "linear-gradient(90deg, rgba(30,41,59,0.5), rgba(34,197,94,0.3))",
    glowHome: 0.35,
    glowAway: 0.7,
    pulseSide: "away",
  },
  IMMINENT_GOAL_WINDOW: {
    slug: "goal-window",
    pulse: "fast",
    mood: "pressure",
    heatAccent: "linear-gradient(90deg, #ff2b2b, #fbbf24)",
    glowHome: 0.8,
    glowAway: 0.8,
    multiZone: true,
  },
  MARKET_LAG: {
    slug: "market-lag",
    pulse: "slow",
    mood: "expectation",
    heatAccent: "linear-gradient(90deg, rgba(96,165,250,0.35), rgba(255,43,43,0.25))",
    glowHome: 0.5,
    glowAway: 0.5,
  },
  ACCELERATED_PACE: {
    slug: "accelerated",
    pulse: "fast",
    mood: "chaos",
    heatAccent: "linear-gradient(90deg, #fbbf24, #ff2b2b)",
    glowHome: 0.7,
    glowAway: 0.7,
    multiZone: true,
  },
  OFFENSIVE_SURGE: {
    slug: "surge",
    pulse: "normal",
    mood: "pressure",
    heatAccent: "linear-gradient(90deg, rgba(255,43,43,0.5), rgba(251,146,60,0.4))",
    glowHome: 0.75,
    glowAway: 0.55,
  },
  REACTIVE_PHASE: {
    slug: "reactive",
    pulse: "slow",
    mood: "calm",
    heatAccent: "linear-gradient(90deg, rgba(148,163,184,0.3), rgba(59,130,246,0.2))",
    glowHome: 0.45,
    glowAway: 0.45,
  },
  TRUNCATED_RHYTHM: {
    slug: "truncated",
    pulse: "none",
    mood: "calm",
    heatAccent: "linear-gradient(90deg, rgba(100,116,139,0.25), rgba(100,116,139,0.15))",
    glowHome: 0.35,
    glowAway: 0.35,
  },
  PRE_MATCH_OPEN: {
    slug: "pre-open",
    pulse: "slow",
    mood: "expectation",
    heatAccent: "linear-gradient(90deg, rgba(34,197,94,0.3), rgba(59,130,246,0.25))",
    glowHome: 0.4,
    glowAway: 0.4,
  },
  PRE_MATCH_CLOSED: {
    slug: "pre-closed",
    pulse: "none",
    mood: "expectation",
    heatAccent: "linear-gradient(90deg, rgba(100,116,139,0.3), rgba(30,41,59,0.2))",
    glowHome: 0.3,
    glowAway: 0.3,
  },
  NEUTRAL_RHYTHM: {
    slug: "neutral",
    pulse: "slow",
    mood: "calm",
    heatAccent: "linear-gradient(90deg, rgba(148,163,184,0.2), rgba(148,163,184,0.15))",
    glowHome: 0.5,
    glowAway: 0.5,
  },
  LOW_DATA: {
    slug: "low-data",
    pulse: "none",
    mood: "calm",
    heatAccent: "transparent",
    glowHome: 0.2,
    glowAway: 0.2,
  },
};

export function getTacticalVisualTheme(profile: TacticalProfile): TacticalVisualTheme {
  return PROFILE_THEMES[profile] ?? PROFILE_THEMES.NEUTRAL_RHYTHM;
}

export function tacticalProfileClass(profile: TacticalProfile): string {
  return `gp-tactical--${getTacticalVisualTheme(profile).slug}`;
}

function shortTeam(name: string): string {
  const p = name.trim().split(/\s+/);
  return p[p.length - 1] ?? name;
}

/** Headline curta para o topo do Match Center — sensação, não técnico. */
export function liveStoryHeadline(input: MatchStoryVisualInput): LiveStoryHeadline {
  if (input.isPreMatch) {
    if (input.tacticalProfile === "PRE_MATCH_OPEN") {
      return {
        title: "Partida extremamente aberta no papel",
        subtitle: input.tacticalNarrative,
      };
    }
    if (input.tacticalProfile === "PRE_MATCH_CLOSED") {
      return {
        title: "Expectativa de jogo fechado",
        subtitle: input.tacticalNarrative,
      };
    }
    return {
      title: "Aguardando o apito — leitura de expectativa",
      subtitle: input.tacticalNarrative,
    };
  }

  const map: Partial<Record<TacticalProfile, LiveStoryHeadline>> = {
    OPEN_EXCHANGE: {
      title: "Partida extremamente aberta",
      subtitle: input.tacticalNarrative,
    },
    TERRITORIAL_DOMINANCE: {
      title:
        input.offensiveControl === "HOME"
          ? `${shortTeam(input.homeTeam)} controla território`
          : input.offensiveControl === "AWAY"
            ? `${shortTeam(input.awayTeam)} controla território`
            : "Domínio territorial em campo",
      subtitle: input.tacticalNarrative,
    },
    MARKET_LAG: {
      title: "Mercado ainda lento para a pressão recente",
      subtitle: input.tacticalNarrative,
    },
    FAVORITE_TRAPPED: {
      title: "Favorito sem controle emocional do jogo",
      subtitle: input.tacticalNarrative,
    },
    DANGEROUS_COUNTER: {
      title: "Ameaça viva em transição",
      subtitle: input.tacticalNarrative,
    },
    EMOTIONAL_SWING: {
      title: "Jogo emocional neste momento",
      subtitle: input.tacticalNarrative,
    },
    IMMINENT_GOAL_WINDOW: {
      title: "Risco de gol no ar",
      subtitle: input.tacticalNarrative,
    },
    HIGH_PRESSURE: {
      title: "Pressão alta — jogo exige atenção",
      subtitle: input.tacticalNarrative,
    },
    STERILE_POSSESSION: {
      title: "Controle sem finalização",
      subtitle: input.tacticalNarrative,
    },
    TRUNCATED_RHYTHM: {
      title: "Ritmo baixo e truncado",
      subtitle: input.tacticalNarrative,
    },
  };

  return (
    map[input.tacticalProfile] ?? {
      title: input.tacticalNarrative.split(/[.—]/)[0]?.trim() || "Leitura ao vivo",
      subtitle: input.tacticalNarrative,
    }
  );
}

function feelBand(level: number): string {
  if (level >= 78) return "Explosivo";
  if (level >= 58) return "Quente";
  if (level >= 35) return "Morno";
  return "Frio";
}

/** Medidores humanizados — sem números na UI principal. */
export function gameTemperatureFeels(
  input: MatchStoryVisualInput
): TemperatureFeel[] {
  const goalRisk = clamp(
    input.transitionRisk * 0.45 +
      input.tacticalIntensity * 0.35 +
      (input.volatilityProfile === "OPEN" || input.volatilityProfile === "CHAOTIC"
        ? 22
        : 0),
    0,
    100
  );
  const volLevel =
    input.volatilityProfile === "CHAOTIC"
      ? 88
      : input.volatilityProfile === "OPEN"
        ? 72
        : input.volatilityProfile === "STABLE"
          ? 38
          : 52;

  return [
    {
      key: "emotion",
      label: "Temperatura emocional",
      feel: feelBand(input.emotionalTemperature),
      level: input.emotionalTemperature,
    },
    {
      key: "volatility",
      label: "Volatilidade",
      feel:
        input.volatilityProfile === "CHAOTIC"
          ? "Caótica"
          : input.volatilityProfile === "OPEN"
            ? "Aberta"
            : input.volatilityProfile === "CONTROLLED"
              ? "Controlada"
              : "Estável",
      level: volLevel,
    },
    {
      key: "goalRisk",
      label: "Risco de gol",
      feel: feelBand(goalRisk),
      level: goalRisk,
    },
    {
      key: "pace",
      label: "Aceleração",
      feel: feelBand(input.momentum),
      level: input.momentum,
    },
  ];
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Resolve glow por lado conforme tema + controle ofensivo. */
export function resolveSideGlow(
  theme: TacticalVisualTheme,
  offensiveControl: OffensiveControlSide,
  homePressure: number,
  awayPressure: number
): { home: number; away: number } {
  let home = theme.glowHome * (homePressure / 100);
  let away = theme.glowAway * (awayPressure / 100);

  if (offensiveControl === "HOME") home = Math.max(home, 0.55);
  if (offensiveControl === "AWAY") away = Math.max(away, 0.55);
  if (theme.dimSide === "home") home *= 0.35;
  if (theme.dimSide === "away") away *= 0.35;
  if (theme.pulseSide === "home") home = Math.max(home, 0.65);
  if (theme.pulseSide === "away") away = Math.max(away, 0.65);

  return { home: clamp(home, 0, 1), away: clamp(away, 0, 1) };
}

export interface StoryChapter {
  id: string;
  minute: number;
  title: string;
  detail: string;
  kind: "open" | "market" | "pressure" | "control" | "emotion";
}

/** Capítulos narrativos para a timeline (derivados de eventos + tática). */
export function buildStoryChapters(
  minute: number,
  chapters: {
    hasGoals: boolean;
    steamMove: boolean;
    pressureRising: boolean;
    profile: TacticalProfile;
    homeLeading: boolean;
    awayLeading: boolean;
  }
): StoryChapter[] {
  const out: StoryChapter[] = [];
  const m = Math.max(1, minute);

  if (chapters.hasGoals && m >= 15) {
    out.push({
      id: "open",
      minute: Math.min(m, 25),
      title: "Jogo abriu",
      detail: "Placar mexeu — ritmo emocional sobe",
      kind: "open",
    });
  }
  if (chapters.steamMove) {
    out.push({
      id: "market",
      minute: m,
      title: "Mercado reagiu",
      detail: "Odds acelerando frente ao campo",
      kind: "market",
    });
  }
  if (chapters.pressureRising) {
    out.push({
      id: "pressure",
      minute: m,
      title: "Pressão aumentou",
      detail: "Intensidade ofensiva em alta",
      kind: "pressure",
    });
  }
  if (
    chapters.profile === "FAVORITE_TRAPPED" ||
    (chapters.homeLeading && chapters.profile === "TERRITORIAL_DOMINANCE")
  ) {
    out.push({
      id: "control",
      minute: m,
      title: "Favorito perdeu controle",
      detail: "Placar e campo em direções opostas",
      kind: "control",
    });
  }
  if (chapters.profile === "EMOTIONAL_SWING") {
    out.push({
      id: "emotion",
      minute: m,
      title: "Pico emocional",
      detail: "Lances recentes mudaram o tom",
      kind: "emotion",
    });
  }

  return out.sort((a, b) => a.minute - b.minute);
}
