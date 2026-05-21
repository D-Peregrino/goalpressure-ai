"use client";

/**
 * Mini sparkline for live pressure / momentum history.
 */
export default function MetricSparkline({
  points,
  color = "#FF2B2B",
  height = 40,
  label = "Pressure",
}: {
  points?: number[];
  color?: string;
  height?: number;
  label?: string;
}) {
  const data = points?.length ? points : [];
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  if (data.length < 2) {
    return (
      <div
        className="gp-sparkline gp-sparkline--empty"
        style={{ height }}
        aria-label={`${label} — coletando`}
      >
        <span className="gp-sparkline__label">{label}</span>
        <span className="gp-sparkline__hint">Coletando dados…</span>
      </div>
    );
  }

  const w = 100;
  const h = 100;
  const coords = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 8) - 4;
    return `${x},${y}`;
  });

  return (
    <div className="gp-sparkline" style={{ height }} aria-label={label}>
      <span className="gp-sparkline__label">{label}</span>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="gp-sparkline__svg">
        <defs>
          <linearGradient id="gp-spark-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points={`0,${h} ${coords.join(" ")} ${w},${h}`}
          fill="url(#gp-spark-fill)"
        />
        <polyline
          points={coords.join(" ")}
          fill="none"
          stroke={color}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
