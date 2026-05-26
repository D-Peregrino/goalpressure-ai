export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function pct(num: number, den: number): number {
  if (den <= 0) return 0;
  return Math.round((num / den) * 1000) / 10;
}

export function clamp100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function bucketGpi(score: number): string {
  if (score < 35) return "0–34";
  if (score < 52) return "35–51";
  if (score < 68) return "52–67";
  if (score < 82) return "68–81";
  return "82–100";
}

export function bucketMinute(minute: number): string {
  if (minute < 30) return "0–29'";
  if (minute < 60) return "30–59'";
  if (minute < 75) return "60–74'";
  return "75+'";
}

export function bucketPressure(pressure: number): string {
  if (pressure < 50) return "Baixa";
  if (pressure < 65) return "Média";
  if (pressure < 78) return "Alta";
  return "Extrema";
}

export function hourFromIso(iso: string): string {
  const h = new Date(iso).getHours();
  return `${String(h).padStart(2, "0")}h`;
}

export function buildDistribution(
  values: number[],
  bucketFn: (v: number) => string
): import("@/lib/admin/quant/quant.types").QuantDistributionBucket[] {
  const map = new Map<string, number>();
  for (const v of values) {
    const b = bucketFn(v);
    map.set(b, (map.get(b) ?? 0) + 1);
  }
  const total = values.length || 1;
  const order = ["0–34", "35–51", "52–67", "68–81", "82–100"];
  const keys = [...map.keys()].sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia >= 0 && ib >= 0) return ia - ib;
    return a.localeCompare(b);
  });
  return keys.map((label) => {
    const count = map.get(label) ?? 0;
    return { label, count, sharePct: pct(count, total) };
  });
}

export function toHeatmap(
  entries: { key: string; label: string; value: number }[]
): import("@/lib/admin/quant/quant.types").QuantHeatmapCell[] {
  const max = Math.max(1, ...entries.map((e) => e.value));
  return entries.map((e) => ({
    ...e,
    intensity: Math.round((e.value / max) * 100),
  }));
}
