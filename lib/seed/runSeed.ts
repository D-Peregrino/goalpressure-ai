import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  SEED_PREFIX,
  SEED_TAG,
  SEED_DEFAULT_PASSWORD,
  SEED_USERS,
  seedFixtureId,
  seedSignalId,
} from "@/lib/seed/config";
import { SEED_MATCH_TEMPLATES, OPERATIONAL_EVENT_TEMPLATES } from "@/lib/seed/data/fixtures";
import { minutesAgo, hoursFromNow, pick, rand, randInt, round } from "@/lib/seed/generators";

export type SeedResult = {
  ok: boolean;
  error?: string;
  counts: Record<string, number>;
};

const MARKETS = ["OVER_1_5", "OVER_2_5", "BTTS", "OVER_0_5"] as const;

export async function clearSeedData(admin: SupabaseClient): Promise<SeedResult> {
  const counts: Record<string, number> = {};

  const del = async (table: string, col: string, pattern: string) => {
    const { data, error } = await admin.from(table).delete().like(col, `${SEED_PREFIX}%`).select("id");
    if (error) throw new Error(`${table}: ${error.message}`);
    counts[table] = data?.length ?? 0;
  };

  await del("operational_events", "fixture_id", SEED_PREFIX);
  await admin.from("signals").delete().like("signal_id", `${SEED_PREFIX}%`);
  await admin.from("signal_dispatches").delete().like("fixture_id", `${SEED_PREFIX}%`);
  await admin.from("live_metrics").delete().like("fixture_id", `${SEED_PREFIX}%`);
  await admin.from("market_edges").delete().like("fixture_id", `${SEED_PREFIX}%`);
  await admin.from("market_snapshots").delete().like("fixture_id", `${SEED_PREFIX}%`);
  await admin.from("matches").delete().like("external_id", `${SEED_PREFIX}%`);
  await admin.from("ops_logs").delete().like("event", `${SEED_PREFIX}%`);
  await admin.from("backtest_results").delete().like("strategy", `${SEED_PREFIX}%`);

  const seedEmails = Object.values(SEED_USERS);
  for (const email of seedEmails) {
    const { data: users } = await admin.auth.admin.listUsers({ perPage: 200 });
    const found = users.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) {
      await admin.auth.admin.deleteUser(found.id);
      counts.authUsers = (counts.authUsers ?? 0) + 1;
    }
  }

  return { ok: true, counts };
}

export async function runOperationalSeed(options?: { clear?: boolean }): Promise<SeedResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase não configurado (URL + SUPABASE_SERVICE_ROLE_KEY).", counts: {} };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: "Cliente admin indisponível.", counts: {} };
  }

  const counts: Record<string, number> = {};

  if (options?.clear) {
    const cleared = await clearSeedData(admin);
    if (!cleared.ok) return cleared;
    Object.assign(counts, { cleared: 1, ...cleared.counts });
  }

  const now = new Date().toISOString();
  const matchRows = SEED_MATCH_TEMPLATES.map((t, i) => {
    const extId = seedFixtureId(i + 1);
    const isUpcoming = t.status === "NOT_STARTED";
    const isFinished = t.status === "FINISHED";
    return {
      external_id: extId,
      fixture_id: extId,
      home_team: t.homeTeam,
      away_team: t.awayTeam,
      league: t.league,
      minute: t.minute,
      status: t.status,
      pressure_score: isUpcoming || isFinished ? 0 : t.pressureScore,
      score: t.score,
      stats: {
        ...t.stats,
        teamStats: {
          home: {
            shots: Math.ceil(t.stats.shots * 0.55),
            shotsOnTarget: Math.ceil(t.stats.shotsOnTarget * 0.55),
            dangerousAttacks: Math.ceil(t.stats.dangerousAttacks * 0.55),
            totalAttacks: t.stats.dangerousAttacks + 5,
            corners: Math.ceil(t.stats.corners * 0.55),
            xG: round(t.stats.xG * 0.55),
            possession: t.stats.possession,
          },
          away: {
            shots: Math.floor(t.stats.shots * 0.45),
            shotsOnTarget: Math.floor(t.stats.shotsOnTarget * 0.45),
            dangerousAttacks: Math.floor(t.stats.dangerousAttacks * 0.45),
            totalAttacks: t.stats.dangerousAttacks,
            corners: Math.floor(t.stats.corners * 0.45),
            xG: round(t.stats.xG * 0.45),
            possession: 100 - t.stats.possession,
          },
        },
      },
      odds: t.odds,
      updated_at: isUpcoming ? hoursFromNow(randInt(1, 5)) : minutesAgo(randInt(1, 45)),
      last_seen_at: now,
    };
  });

  const { error: matchErr } = await admin.from("matches").upsert(matchRows, { onConflict: "external_id" });
  if (matchErr) return { ok: false, error: matchErr.message, counts };
  counts.matches = matchRows.length;

  const liveFixtures = matchRows.filter((m) => m.status === "LIVE" || m.status === "HALFTIME");

  const signalRows = Array.from({ length: 36 }, (_, i) => {
    const m = pick(liveFixtures.length ? liveFixtures : matchRows);
    const market = pick(MARKETS);
    const resolved = i % 3 === 0;
    const hit = resolved && i % 2 === 0;
    return {
      signal_id: seedSignalId(i + 1),
      fixture_id: m.fixture_id,
      match_id: m.external_id,
      external_id: m.external_id,
      model_id: "gp-production-v1",
      market,
      confidence: i % 4 === 0 ? "HIGH" : "MEDIUM",
      pressure: round(rand(62, 92)),
      odd: round(rand(1.45, 2.4)),
      roi: resolved ? round(hit ? rand(0.4, 1.2) : rand(-1, -0.3)) : null,
      outcome: resolved ? (hit ? "HIT" : "MISS") : null,
      status: resolved ? "RESOLVED" : "PENDING",
      stake: i % 4 === 0 ? 1 : 0.5,
      home_team: m.home_team,
      away_team: m.away_team,
      league: m.league,
      trigger_minute: randInt(20, 85),
      metadata: { seed: SEED_TAG, narrative: pick(OPERATIONAL_EVENT_TEMPLATES).narrative },
      created_at: minutesAgo(randInt(5, 720)),
      resolved_at: resolved ? minutesAgo(randInt(1, 60)) : null,
    };
  });

  const { error: sigErr } = await admin.from("signals").upsert(signalRows, { onConflict: "signal_id" });
  if (sigErr) return { ok: false, error: sigErr.message, counts };
  counts.signals = signalRows.length;

  const dispatchRows = Array.from({ length: 28 }, (_, i) => {
    const m = pick(liveFixtures.length ? liveFixtures : matchRows);
    const market = pick(MARKETS);
    const ev = round(rand(0.05, 0.22));
    return {
      fixture_id: m.fixture_id!,
      market,
      pressure_score: round(rand(68, 94)),
      momentum: round(rand(0.4, 0.95)),
      goal_probability: round(rand(0.35, 0.78), 4),
      confidence: round(rand(0.55, 0.92), 4),
      ev,
      fair_odd: round(1 / (rand(0.42, 0.58)), 2),
      market_odd: round(rand(1.5, 2.6), 2),
      triggered: i % 3 !== 0,
      telegram_sent: i % 5 === 0,
      metadata: {
        seed: SEED_TAG,
        headline: pick(OPERATIONAL_EVENT_TEMPLATES).headline,
        analysis: "Leitura EV+ com pressão ofensiva sustentada.",
      },
      created_at: minutesAgo(randInt(2, 120)),
    };
  });

  const { error: dispErr } = await admin.from("signal_dispatches").insert(dispatchRows);
  if (dispErr) return { ok: false, error: dispErr.message, counts };
  counts.signal_dispatches = dispatchRows.length;

  const metricRows = liveFixtures.flatMap((m) =>
    Array.from({ length: 4 }, () => ({
      fixture_id: m.fixture_id!,
      home_pressure: round(rand(35, 75)),
      away_pressure: round(rand(25, 65)),
      momentum: round(rand(-0.2, 0.9)),
      goal_probability: round(rand(0.2, 0.75), 4),
      confidence: round(rand(0.5, 0.9), 4),
      metadata: { seed: SEED_TAG },
      created_at: minutesAgo(randInt(1, 30)),
    }))
  );

  const { error: metErr } = await admin.from("live_metrics").insert(metricRows);
  if (metErr) return { ok: false, error: metErr.message, counts };
  counts.live_metrics = metricRows.length;

  const edgeRows = liveFixtures.flatMap((m) =>
    ["OVER_1_5", "OVER_2_5"].map((market) => {
      const edgePct = round(rand(4, 14));
      const implied = round(rand(0.42, 0.55), 4);
      const prop = implied + edgePct / 100;
      return {
        fixture_id: m.fixture_id!,
        market,
        proprietary_probability: round(prop, 4),
        implied_probability: implied,
        edge: round(prop - implied, 4),
        edge_percent: edgePct,
        fair_odd: round(1 / prop, 2),
        market_odd: round(rand(1.55, 2.4), 2),
        expected_value: round(rand(0.06, 0.2), 4),
        confidence: round(rand(0.6, 0.88), 4),
        mispricing_score: round(rand(55, 88)),
        classification: edgePct >= 10 ? "STRONG" : "WATCH",
        odds_drift: round(rand(-0.08, 0.12), 4),
        steam_move: Math.random() > 0.6,
        metadata: { seed: SEED_TAG },
        created_at: minutesAgo(randInt(3, 90)),
      };
    })
  );

  const { error: edgeErr } = await admin.from("market_edges").insert(edgeRows);
  if (edgeErr) return { ok: false, error: edgeErr.message, counts };
  counts.market_edges = edgeRows.length;

  const opEvents = Array.from({ length: 24 }, (_, i) => {
    const tpl = OPERATIONAL_EVENT_TEMPLATES[i % OPERATIONAL_EVENT_TEMPLATES.length];
    const m = pick(liveFixtures.length ? liveFixtures : matchRows);
    const severity = tpl.type === "goal_probable" || tpl.type === "ev_plus" ? "hot" : i % 3 === 0 ? "watch" : "info";
    return {
      fixture_id: m.fixture_id,
      home_team: m.home_team,
      away_team: m.away_team,
      league: m.league,
      event_type: tpl.type,
      headline: tpl.headline,
      narrative: tpl.narrative,
      severity,
      metadata: { seed: SEED_TAG },
      created_at: minutesAgo(randInt(1, 180)),
    };
  });

  const { error: opErr } = await admin.from("operational_events").insert(opEvents);
  if (opErr && !opErr.message.includes("does not exist")) {
    return { ok: false, error: opErr.message, counts };
  }
  if (!opErr) counts.operational_events = opEvents.length;

  const opsLogs = opEvents.slice(0, 12).map((e) => ({
    event: `${SEED_PREFIX}_${e.event_type}`,
    message: `${e.headline}: ${e.home_team} x ${e.away_team}`,
    metadata: { fixture_id: e.fixture_id, severity: e.severity, seed: SEED_TAG },
    created_at: e.created_at,
  }));
  await admin.from("ops_logs").insert(opsLogs);
  counts.ops_logs = opsLogs.length;

  const backtestRows = [
    {
      strategy: `${SEED_PREFIX}_pressure_ev`,
      market: "OVER_1_5",
      total_signals: 142,
      wins: 89,
      losses: 53,
      roi: 18.4,
      yield: 12.2,
      hit_rate: 62.7,
      profit_units: 26.1,
      max_drawdown: 4.2,
      metadata: { seed: SEED_TAG },
    },
    {
      strategy: `${SEED_PREFIX}_live_momentum`,
      market: "OVER_2_5",
      total_signals: 98,
      wins: 54,
      losses: 44,
      roi: 11.2,
      yield: 8.5,
      hit_rate: 55.1,
      profit_units: 11.0,
      max_drawdown: 6.8,
      metadata: { seed: SEED_TAG },
    },
  ];
  await admin.from("backtest_results").insert(backtestRows);
  counts.backtest_results = backtestRows.length;

  const hitRate =
    signalRows.filter((s) => s.outcome === "HIT").length /
    Math.max(1, signalRows.filter((s) => s.status === "RESOLVED").length);

  await admin.from("analytics_snapshots").insert({
    snapshot_type: "signal_summary",
    payload: {
      seed: SEED_TAG,
      generatedAt: now,
      totals: {
        totalSignals: signalRows.length,
        hitRate: round(hitRate * 100, 1),
        roiTotal: 14.6,
        maxDrawdown: 5.1,
      },
      roiCurve: signalRows
        .filter((s) => s.status === "RESOLVED")
        .slice(0, 12)
        .map((s, idx) => ({
          signalId: s.signal_id,
          cumulativeRoi: round((idx + 1) * (s.outcome === "HIT" ? 0.8 : -0.4)),
        })),
    },
    generated_at: now,
  });
  counts.analytics_snapshots = 1;

  const leadRows = [
    { name: "Rafael M.", email: "rafael.m@exemplo.com", source: "landing", status: "new", interest: "fundador" },
    { name: "Camila S.", email: "camila.s@exemplo.com", source: "terminal", status: "qualified", interest: "pro" },
    { name: "Diego P.", email: "diego.p@exemplo.com", source: "precos", status: "trial", coupon_code: "BARBOSATIPS75" },
    { name: "Ana L.", email: "ana.l@exemplo.com", source: "instagram", status: "converted", interest: "fundador" },
    { name: "Lucas F.", email: "lucas.f@exemplo.com", source: "landing", status: "contacted" },
    { name: "Marina T.", email: "marina.t@exemplo.com", source: "referral", status: "new" },
    { name: "Pedro H.", email: "pedro.h@exemplo.com", source: "terminal", status: "lost" },
    { name: "Julia R.", email: "julia.r@exemplo.com", source: "ads", status: "qualified" },
  ].map((l) => ({ ...l, created_at: minutesAgo(randInt(60, 1440 * 14)) }));

  await admin.from("leads").insert(leadRows);
  counts.leads = leadRows.length;

  const userSpecs = [
    { email: SEED_USERS.admin, name: "Admin Seed", plan: "fundador" as const, role: "admin" as const },
    { email: SEED_USERS.founder, name: "Fundador Seed", plan: "fundador" as const, role: "user" as const },
    { email: SEED_USERS.free, name: "Free Seed", plan: "free" as const, role: "user" as const },
    { email: SEED_USERS.premium, name: "Premium Seed", plan: "pro" as const, role: "user" as const },
  ];

  for (const spec of userSpecs) {
    const { data: existing } = await admin.auth.admin.listUsers({ perPage: 200 });
    let userId = existing.users.find((u) => u.email?.toLowerCase() === spec.email.toLowerCase())?.id;

    if (!userId) {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: spec.email,
        password: SEED_DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: { name: spec.name, seed: SEED_TAG },
      });
      if (createErr) {
        return { ok: false, error: `Auth ${spec.email}: ${createErr.message}`, counts };
      }
      userId = created.user?.id;
    }

    if (!userId) continue;

    await admin.from("profiles").upsert(
      {
        user_id: userId,
        email: spec.email,
        name: spec.name,
        role: spec.role,
        updated_at: now,
      },
      { onConflict: "user_id" }
    );

    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + (spec.plan === "fundador" ? 12 : 1));

    await admin.from("subscriptions").upsert(
      {
        user_id: userId,
        plan: spec.plan,
        status: "active",
        provider: `${SEED_PREFIX}_seed`,
        current_period_start: now,
        current_period_end: periodEnd.toISOString(),
        updated_at: now,
      },
      { onConflict: "user_id" }
    );

    if (spec.plan === "fundador") {
      await admin.from("payments").insert({
        user_id: userId,
        provider: `${SEED_PREFIX}_seed`,
        provider_payment_id: `${SEED_PREFIX}_pay_${spec.email}`,
        amount_cents: 4900,
        original_amount_cents: 4900,
        currency: "BRL",
        status: "paid",
        paid_at: minutesAgo(randInt(1, 48)),
      });
    }

    counts[`user_${spec.email}`] = 1;
  }

  return { ok: true, counts };
}
