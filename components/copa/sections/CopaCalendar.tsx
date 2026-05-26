import CopaMatchRow from "@/components/copa/CopaMatchRow";
import type { CopaCalendarDay } from "@/lib/copa/types";

export default function CopaCalendar({ days }: { days: CopaCalendarDay[] }) {
  return (
    <div className="gp-copa-card">
      <p className="gp-copa-card__title">Calendário</p>
      {days.length === 0 ? (
        <p style={{ color: "var(--copa-muted)", margin: 0 }}>Calendário indisponível.</p>
      ) : (
        days.map((day) => (
          <div key={day.date} style={{ marginBottom: "1.25rem" }}>
            <h3 style={{ margin: "0 0 0.5rem", fontSize: "0.95rem", color: "var(--copa-green-deep)" }}>
              {day.label}
            </h3>
            {day.matches.length === 0 ? (
              <p style={{ fontSize: "0.8rem", color: "var(--copa-muted)", margin: 0 }}>Sem jogos.</p>
            ) : (
              day.matches.map((m) => <CopaMatchRow key={m.fixtureId} match={m} />)
            )}
          </div>
        ))
      )}
    </div>
  );
}
