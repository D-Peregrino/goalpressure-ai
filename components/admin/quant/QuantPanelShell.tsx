"use client";

export function QuantPanelShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="gp-quant-panel">
      <header className="gp-quant-panel__head">
        <h2 className="gp-quant-panel__title">{title}</h2>
        {subtitle ? <p className="gp-quant-panel__sub">{subtitle}</p> : null}
      </header>
      {children}
    </section>
  );
}

export function QuantMetricGrid({
  items,
}: {
  items: { label: string; value: string | number; hint?: string }[];
}) {
  return (
    <div className="gp-quant-metrics">
      {items.map((item) => (
        <div key={item.label} className="gp-quant-metrics__cell">
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          {item.hint ? <em>{item.hint}</em> : null}
        </div>
      ))}
    </div>
  );
}

export function QuantHeatmapGrid({
  cells,
}: {
  cells: { key: string; label: string; value: number; intensity: number }[];
}) {
  if (cells.length === 0) {
    return <p className="gp-quant-muted">Sem amostras suficientes</p>;
  }
  return (
    <div className="gp-quant-heatmap">
      {cells.map((c) => (
        <div
          key={c.key}
          className="gp-quant-heatmap__cell"
          style={{ "--gp-intensity": `${c.intensity}%` } as React.CSSProperties}
          title={`${c.label}: ${c.value}`}
        >
          <span className="gp-quant-heatmap__label">{c.label}</span>
          <strong>{c.value}</strong>
        </div>
      ))}
    </div>
  );
}

export function QuantBarList({
  rows,
}: {
  rows: { label: string; value: number; pct?: number }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="gp-quant-bars">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="gp-quant-bars__top">
            <span>{r.label}</span>
            <strong>
              {r.value}
              {r.pct != null ? ` · ${r.pct}%` : ""}
            </strong>
          </div>
          <div className="gp-quant-bars__track">
            <span style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
