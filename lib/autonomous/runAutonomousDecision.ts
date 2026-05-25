import type { Match } from "@/types/domain";
import type {
  AutonomousCoreSnapshot,
  AutonomousDecisionInput,
  MatchAutonomousProfile,
} from "@/lib/autonomous/autonomous.types";
import { detectMarketRegime } from "@/lib/autonomous/detectMarketRegime";
import { adaptiveThresholds } from "@/lib/autonomous/adaptiveThresholds";
import { calculateSignalSensitivity } from "@/lib/autonomous/calculateSignalSensitivity";
import { detectFalsePositiveRisk } from "@/lib/autonomous/detectFalsePositiveRisk";
import { detectOverfitting } from "@/lib/autonomous/detectOverfitting";
import { adjustOperationalAggression } from "@/lib/autonomous/adjustOperationalAggression";
import { optimizeDispatchIntensity } from "@/lib/autonomous/optimizeDispatchIntensity";
import { buildSelfCalibrationRecommendations } from "@/lib/autonomous/selfCalibration";
import { buildAutonomousAlerts } from "@/lib/autonomous/buildAutonomousAlerts";
import { logAutonomousMetric } from "@/lib/autonomous/autonomousLogger";
import { getLearningSnapshot } from "@/lib/engine/learning/learningSnapshotStore";
import { persistAutonomousDecision } from "@/lib/autonomous/autonomousPersistence";
import { setAutonomousCoreSnapshot } from "@/lib/autonomous/autonomousSnapshotStore";

function fixtureId(match: Match): string {
  return match.externalId ?? match.id.replace(/^sm-/, "") ?? match.id;
}

function operationalScore(match: Match): number {
  const p = match.pressure?.score ?? 0;
  const ev = match.evEngine?.expectedValue.best?.evPercent ?? 0;
  const ops = match.opsIntelligence?.focusScore ?? 0;
  const edge = match.learningContext?.historicalEdge.score ?? 0;
  return Math.round(p * 0.35 + Math.max(0, ev) * 2 + ops * 0.2 + edge * 0.15);
}

function leagueSampleSize(match: Match): number {
  const snap = getLearningSnapshot();
  if (!snap) return 0;
  const league = match.league;
  return snap.leagues.find((l) => l.league === league)?.sampleSize ?? 0;
}

export function runAutonomousDecisionForMatch(
  match: Match,
  globals?: { accuracy?: number; falsePositiveRate?: number }
): MatchAutonomousProfile {
  const input: AutonomousDecisionInput = {
    match,
    globalAccuracy: globals?.accuracy ?? getLearningSnapshot()?.accuracy.hitRate,
    globalFalsePositiveRate:
      globals?.falsePositiveRate ?? getLearningSnapshot()?.falsePositiveRate,
    leagueSampleSize: leagueSampleSize(match),
  };

  const fid = fixtureId(match);
  const regime = detectMarketRegime(input);
  const thresholds = adaptiveThresholds(input, regime);
  const falsePositiveRisk = detectFalsePositiveRisk(input);
  const overfittingRisk = detectOverfitting(input);
  const sensitivity = calculateSignalSensitivity(input, regime, falsePositiveRisk);
  const aggression = adjustOperationalAggression(
    input,
    regime,
    sensitivity,
    falsePositiveRisk,
    overfittingRisk
  );
  const opScore = operationalScore(match);
  const dispatch = optimizeDispatchIntensity(
    input,
    thresholds,
    sensitivity,
    aggression,
    falsePositiveRisk,
    opScore
  );

  const selfCalibrationNotes = buildSelfCalibrationRecommendations(
    input,
    regime,
    sensitivity,
    falsePositiveRisk,
    overfittingRisk
  );

  const alerts = buildAutonomousAlerts(input, regime, sensitivity, falsePositiveRisk, fid);
  const regimeChanged = alerts.some((a) => a.type === "REGIME_CHANGED");

  let autonomousConfidence = Math.round(
    55 +
      (input.globalAccuracy ?? 50) * 0.25 -
      falsePositiveRisk * 0.35 -
      overfittingRisk * 0.2 +
      (match.evEngine?.confidence.score ?? 0) * 0.15
  );
  autonomousConfidence = Math.min(95, Math.max(15, autonomousConfidence));

  const profile: MatchAutonomousProfile = {
    marketRegime: regime,
    sensitivity,
    adaptiveThresholds: thresholds,
    falsePositiveRisk,
    overfittingRisk,
    aggressionMode: aggression,
    dispatchIntensity: dispatch.intensity,
    dispatchApproved: dispatch.approved,
    autonomousConfidence,
    selfCalibrationNotes,
    regimeChanged,
    updatedAt: new Date().toISOString(),
  };

  logAutonomousMetric({
    fixture: fid,
    regime,
    sensitivity,
    aggression,
    falsePositive: falsePositiveRisk,
    dispatch: dispatch.intensity,
  });

  void persistAutonomousDecision(fid, profile, dispatch.intensity);

  return profile;
}

export function applyAutonomousProfileToMatch(
  match: Match,
  profile: MatchAutonomousProfile
): Match {
  return {
    ...match,
    autonomousProfile: profile,
  };
}

export function runAutonomousBatch(
  matches: Match[]
): { matches: Match[]; snapshot: AutonomousCoreSnapshot } {
  const learning = getLearningSnapshot();
  const globals = {
    accuracy: learning?.accuracy.hitRate,
    falsePositiveRate: learning?.falsePositiveRate,
  };

  const profilesByFixture: Record<string, MatchAutonomousProfile> = {};
  const allAlerts: AutonomousCoreSnapshot["alerts"] = [];
  let fpSum = 0;
  let confSum = 0;
  const regimeCounts = new Map<string, number>();

  const enriched = matches.map((m) => {
    const profile = runAutonomousDecisionForMatch(m, globals);
    const fid = fixtureId(m);
    profilesByFixture[fid] = profile;
    fpSum += profile.falsePositiveRisk;
    confSum += profile.autonomousConfidence;
    regimeCounts.set(
      profile.marketRegime,
      (regimeCounts.get(profile.marketRegime) ?? 0) + 1
    );
    allAlerts.push(
      ...buildAutonomousAlerts(
        { match: m, ...globals, leagueSampleSize: leagueSampleSize(m) },
        profile.marketRegime,
        profile.sensitivity,
        profile.falsePositiveRisk,
        fid
      )
    );
    return applyAutonomousProfileToMatch(m, profile);
  });

  const dominantRegime = [...regimeCounts.entries()].sort(
    (a, b) => b[1] - a[1]
  )[0]?.[0] as AutonomousCoreSnapshot["dominantRegime"] | undefined;

  const primary = enriched
    .filter((m) => m.autonomousProfile?.dispatchIntensity === "HERO_PRIMARY")
    .sort(
      (a, b) =>
        (b.autonomousProfile?.autonomousConfidence ?? 0) -
        (a.autonomousProfile?.autonomousConfidence ?? 0)
    )[0];

  const primaryProfile = primary?.autonomousProfile;

  const snapshot: AutonomousCoreSnapshot = {
    generatedAt: new Date().toISOString(),
    dominantRegime: dominantRegime ?? "CALM_MARKET",
    sensitivity: primaryProfile?.sensitivity ?? "BALANCED",
    aggressionMode: primaryProfile?.aggressionMode ?? "NORMAL",
    activeThresholds:
      primaryProfile?.adaptiveThresholds ??
      (matches[0]
        ? adaptiveThresholds(
            { match: matches[0], ...globals, leagueSampleSize: leagueSampleSize(matches[0]) },
            "CALM_MARKET"
          )
        : {
            minPressureScore: 62,
            minEvPercent: 3.5,
            minConfidence: 48,
            minUrgencyScore: 42,
          }),
    avgFalsePositiveRisk:
      enriched.length > 0 ? Math.round(fpSum / enriched.length) : 0,
    autonomousConfidence:
      enriched.length > 0 ? Math.round(confSum / enriched.length) : 0,
    selfCalibration: primaryProfile?.selfCalibrationNotes ?? [],
    alerts: allAlerts.slice(0, 12),
    profilesByFixture,
  };

  setAutonomousCoreSnapshot(snapshot);

  return { matches: enriched, snapshot };
}

/** Agrega snapshot sem reprocessar (após worker). */
export function buildAutonomousSnapshotFromMatches(
  matches: Match[]
): AutonomousCoreSnapshot {
  const learning = getLearningSnapshot();
  const globals = {
    accuracy: learning?.accuracy.hitRate,
    falsePositiveRate: learning?.falsePositiveRate,
  };

  const profilesByFixture: Record<string, MatchAutonomousProfile> = {};
  const allAlerts: AutonomousCoreSnapshot["alerts"] = [];
  let fpSum = 0;
  let confSum = 0;
  const regimeCounts = new Map<string, number>();

  for (const m of matches) {
    const profile = m.autonomousProfile;
    if (!profile) continue;
    const fid = fixtureId(m);
    profilesByFixture[fid] = profile;
    fpSum += profile.falsePositiveRisk;
    confSum += profile.autonomousConfidence;
    regimeCounts.set(
      profile.marketRegime,
      (regimeCounts.get(profile.marketRegime) ?? 0) + 1
    );
    allAlerts.push(
      ...buildAutonomousAlerts(
        { match: m, ...globals, leagueSampleSize: leagueSampleSize(m) },
        profile.marketRegime,
        profile.sensitivity,
        profile.falsePositiveRisk,
        fid
      )
    );
  }

  const dominantRegime = [...regimeCounts.entries()].sort(
    (a, b) => b[1] - a[1]
  )[0]?.[0] as AutonomousCoreSnapshot["dominantRegime"] | undefined;

  const primary = matches.find(
    (m) => m.autonomousProfile?.dispatchIntensity === "HERO_PRIMARY"
  );
  const primaryProfile = primary?.autonomousProfile;
  const withProfile = matches.filter((m) => m.autonomousProfile);

  const snapshot: AutonomousCoreSnapshot = {
    generatedAt: new Date().toISOString(),
    dominantRegime: dominantRegime ?? "CALM_MARKET",
    sensitivity: primaryProfile?.sensitivity ?? "BALANCED",
    aggressionMode: primaryProfile?.aggressionMode ?? "NORMAL",
    activeThresholds:
      primaryProfile?.adaptiveThresholds ?? {
        minPressureScore: 62,
        minEvPercent: 3.5,
        minConfidence: 48,
        minUrgencyScore: 42,
      },
    avgFalsePositiveRisk:
      withProfile.length > 0 ? Math.round(fpSum / withProfile.length) : 0,
    autonomousConfidence:
      withProfile.length > 0 ? Math.round(confSum / withProfile.length) : 0,
    selfCalibration: primaryProfile?.selfCalibrationNotes ?? [],
    alerts: allAlerts.slice(0, 12),
    profilesByFixture,
  };

  setAutonomousCoreSnapshot(snapshot);
  return snapshot;
}
