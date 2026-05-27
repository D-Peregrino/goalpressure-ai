/**
 * Rótulo de data/hora para cards da aba Futuros — pt-BR, fuso America/Sao_Paulo.
 */

const TZ = "America/Sao_Paulo";

function resolveKickoffDate(
  startingAt?: string | null,
  startingAtTimestamp?: number | null
): Date | null {
  if (startingAtTimestamp != null && startingAtTimestamp > 0) {
    return new Date(startingAtTimestamp * 1000);
  }
  if (startingAt && typeof startingAt === "string") {
    const d = new Date(startingAt);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

/** Chave de calendário YYYY-MM-DD no fuso do terminal. */
function calendarDayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function daysFromToday(kickoff: Date, now: Date): number {
  const kickKey = calendarDayKey(kickoff);
  const todayKey = calendarDayKey(now);
  const kickMs = Date.parse(`${kickKey}T12:00:00Z`);
  const todayMs = Date.parse(`${todayKey}T12:00:00Z`);
  return Math.round((kickMs - todayMs) / 86_400_000);
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(date);
}

function formatWeekdayShort(date: Date): string {
  const raw = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    timeZone: TZ,
  }).format(date);
  const cleaned = raw.replace(/\./g, "").trim();
  if (!cleaned) return raw;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function formatDayMonth(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: TZ,
  }).format(date);
}

/**
 * Ex.: "Hoje · 19:00", "Amanhã · 21:30", "Sex · 20:00", "31/05 · 16:00"
 */
export function formatUpcomingCardKickoffLabel(
  startingAt?: string | null,
  startingAtTimestamp?: number | null,
  now: Date = new Date()
): string | null {
  const kickoff = resolveKickoffDate(startingAt, startingAtTimestamp);
  if (!kickoff) return null;

  const time = formatTime(kickoff);
  const diff = daysFromToday(kickoff, now);

  if (diff === 0) return `Hoje · ${time}`;
  if (diff === 1) return `Amanhã · ${time}`;
  if (diff >= 2 && diff <= 6) return `${formatWeekdayShort(kickoff)} · ${time}`;
  return `${formatDayMonth(kickoff)} · ${time}`;
}
