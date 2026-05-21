import Sidebar from "@/components/Sidebar";
import OpsDashboard from "@/components/ops/OpsDashboard";

export default function OpsPage() {
  return (
    <div className="terminal-shell text-foreground">
      <div className="terminal-scanlines" aria-hidden />
      <div className="terminal-content">
        <Sidebar />

        <main className="min-h-screen w-full pt-14 lg:ml-[280px] lg:pt-0">
          <div className="flex min-h-screen min-w-0 flex-col">
            <div className="flex-1 px-4 py-5 sm:px-5 sm:py-6 lg:px-6 lg:py-7 xl:px-8">
              <OpsDashboard />
            </div>

            <footer className="mt-auto border-t border-card/80 bg-surface/40 px-4 py-3 sm:px-6 lg:px-8">
              <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted">
                GoalPressure AI · Operations Terminal · Dispatch Observability ·{" "}
                {new Date().getFullYear()}
              </p>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
