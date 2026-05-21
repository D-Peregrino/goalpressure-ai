"use client";

import Link from "next/link";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Brain,
  LineChart,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
import { useLiveMatches } from "@/hooks/useLiveMatches";
import ExecutionBadge from "@/components/ui/ExecutionBadge";
import { fadeUp, staggerContainer } from "@/components/ui/motion";

function AnimatedCounter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const controls = animate(0, to, {
      duration: 1.8,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [to]);
  return (
    <span>
      {display}
      {suffix}
    </span>
  );
}

export default function LandingPage() {
  const { matches, signals, status } = useLiveMatches({ pollIntervalMs: 25_000 });
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const glowX = useTransform(mouseX, [0, 1], ["20%", "80%"]);
  const glowY = useTransform(mouseY, [0, 1], ["10%", "60%"]);

  const topMatches = useMemo(
    () =>
      [...matches]
        .sort((a, b) => b.pressure.score - a.pressure.score)
        .slice(0, 4),
    [matches]
  );

  return (
    <div
      className="gp-shell min-h-screen overflow-x-hidden"
      onMouseMove={(e) => {
        mouseX.set(e.clientX / window.innerWidth);
        mouseY.set(e.clientY / window.innerHeight);
      }}
    >
      <div className="gp-ambient" aria-hidden />
      <motion.div
        className="pointer-events-none fixed h-[480px] w-[480px] rounded-full blur-[120px]"
        style={{
          left: glowX,
          top: glowY,
          background: "radial-gradient(circle, rgba(255,43,43,0.18) 0%, transparent 70%)",
        }}
      />

      <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <Link href="/" className="font-sans text-lg font-semibold tracking-tight">
          Goal<span className="text-pressure">Pressure</span>
          <span className="ml-2 hidden font-mono text-[10px] text-muted sm:inline">
            AI
          </span>
        </Link>
        <nav className="flex items-center gap-3 sm:gap-6">
          <Link href="/ops" className="gp-label hidden sm:inline hover:text-foreground">
            Command Center
          </Link>
          <Link href="/terminal" className="gp-label hidden sm:inline hover:text-foreground">
            Live Feed
          </Link>
          <Link href="/ops" className="gp-btn-primary">
            Enter Terminal
            <ArrowRight className="h-4 w-4" />
          </Link>
        </nav>
      </header>

      <motion.section
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto max-w-6xl px-5 pb-20 pt-8 sm:px-8 sm:pt-16"
      >
        <motion.div variants={fadeUp} className="max-w-3xl">
          <p className="gp-label mb-4 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-pressure animate-live-blink" />
            Institutional sports intelligence · Real-time
          </p>
          <h1 className="font-sans text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
            Quant pressure.
            <br />
            <span className="bg-gradient-to-r from-white via-white to-pressure bg-clip-text text-transparent">
              Execution-grade edge.
            </span>
          </h1>
          <p className="mt-6 max-w-xl font-mono text-sm leading-relaxed text-muted sm:text-base">
            GoalPressure AI unifies pressure, chaos, market calibration and meta
            consensus into a single institutional command layer — built for live
            football decision intelligence.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/ops" className="gp-btn-primary text-base px-6 py-3">
              Launch Command Center
              <Zap className="h-4 w-4" />
            </Link>
            <Link href="/terminal" className="gp-btn-ghost text-base px-6 py-3">
              View live matches
            </Link>
          </div>
        </motion.div>

        <motion.div
          variants={fadeUp}
          className="mt-16 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4"
        >
          <div className="gp-card p-4 text-center sm:p-5">
            <p className="gp-label">Live fixtures</p>
            <p className="mt-2 font-mono text-3xl font-bold text-pressure">
              <AnimatedCounter to={matches.length} />
            </p>
          </div>
          <div className="gp-card p-4 text-center sm:p-5">
            <p className="gp-label">Active signals</p>
            <p className="mt-2 font-mono text-3xl font-bold">
              <AnimatedCounter to={signals.length} />
            </p>
          </div>
          <div className="gp-card p-4 text-center sm:p-5">
            <p className="gp-label">Engines</p>
            <p className="mt-2 font-mono text-3xl font-bold">8+</p>
          </div>
          <div className="gp-card p-4 text-center sm:p-5">
            <p className="gp-label">Feed</p>
            <p className="mt-2 font-mono text-lg font-bold uppercase text-emerald-400">
              {status === "live" ? "LIVE" : status}
            </p>
          </div>
        </motion.div>
      </motion.section>

      <section className="relative z-10 border-y border-white/5 bg-white/[0.02] py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="gp-label mb-2">Live edge surface</p>
              <h2 className="font-sans text-2xl font-semibold sm:text-3xl">
                Matches under institutional pressure
              </h2>
            </div>
            <Link href="/terminal" className="gp-label text-pressure hover:underline">
              Full feed →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {topMatches.length === 0 ? (
              <p className="gp-card p-8 font-mono text-sm text-muted col-span-2">
                Waiting for live SportMonks feed…
              </p>
            ) : (
              topMatches.map((m, i) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Link
                    href={`/live/${encodeURIComponent(m.id)}`}
                    className="gp-card gp-glow block p-5 transition-transform hover:-translate-y-0.5"
                  >
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="gp-label">{m.league}</p>
                        <p className="mt-2 font-sans text-lg font-medium">
                          {m.homeTeam} vs {m.awayTeam}
                        </p>
                        <p className="mt-1 font-mono text-[11px] text-muted">
                          {m.minute}&apos; · Pressure {m.pressure.score}
                        </p>
                      </div>
                      <ExecutionBadge
                        grade={
                          m.pressure.score >= 80
                            ? "S"
                            : m.pressure.score >= 65
                              ? "A"
                              : "B"
                        }
                      />
                    </div>
                    <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-pressure/60 to-pressure"
                        style={{ width: `${m.pressure.score}%` }}
                      />
                    </div>
                  </Link>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="relative z-10 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <p className="gp-label mb-8 text-center">Institutional AI stack</p>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                icon: Brain,
                title: "Meta Consensus",
                desc: "Cross-engine institutional score with execution grades S → D.",
              },
              {
                icon: LineChart,
                title: "Market Calibration",
                desc: "Edge persistence, steam reaction and odds lag detection.",
              },
              {
                icon: Shield,
                title: "Validation Lab",
                desc: "Continuous quantitative validation and calibration hints.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="gp-card p-6">
                <Icon className="h-5 w-5 text-pressure mb-4" />
                <h3 className="font-sans text-lg font-medium">{title}</h3>
                <p className="mt-2 font-mono text-[11px] leading-relaxed text-muted">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-white/5 py-16">
        <div className="mx-auto max-w-6xl px-5 text-center sm:px-8">
          <Sparkles className="mx-auto h-6 w-6 text-pressure mb-4" />
          <h2 className="font-sans text-2xl font-semibold sm:text-4xl">
            Built for funds, syndicates & quant desks
          </h2>
          <p className="mx-auto mt-4 max-w-lg font-mono text-sm text-muted">
            Premium terminal access · Closed beta · Pricing on request
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <div className="gp-card px-8 py-6 min-w-[200px]">
              <p className="gp-label">Starter</p>
              <p className="mt-2 font-sans text-2xl font-semibold">—</p>
              <p className="mt-1 text-[10px] text-muted">Coming soon</p>
            </div>
            <div className="gp-card gp-glow px-8 py-6 min-w-[200px] border-pressure/30">
              <p className="gp-label text-pressure">Institutional</p>
              <p className="mt-2 font-sans text-2xl font-semibold">Custom</p>
              <p className="mt-1 text-[10px] text-muted">Full command center</p>
            </div>
          </div>
          <Link href="/ops" className="gp-btn-primary mt-12 inline-flex">
            Request access
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/5 py-8 text-center">
        <p className="gp-label">
          GoalPressure AI · goalpressure.com.br · {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
