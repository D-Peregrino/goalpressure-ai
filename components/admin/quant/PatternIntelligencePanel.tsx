"use client";

import type { QuantPatternRow } from "@/lib/admin/quant/quant.types";
import { QuantPanelShell } from "./QuantPanelShell";

function PatternTable({
  title,
  rows,
  variant,
}: {
  title: string;
  rows: QuantPatternRow[];
  variant: "strong" | "weak";
}) {
  return (
    <div className={`gp-quant-pattern-block gp-quant-pattern-block--${variant}`}>
      <h3 className="gp-quant-section-label">{title}</h3>
      <ul className="gp-quant-pattern-list">
        {rows.length === 0 ? (
          <li className="gp-quant-muted">Sem dados</li>
        ) : (
          rows.map((p) => (
            <li key={p.id}>
              <strong>{p.label}</strong>
              <span>
                Assertividade {p.effectivenessPct}% · FP {p.falsePositivePct}% · {p.frequency}×
              </span>
              {p.combo ? <em>{p.combo}</em> : null}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export default function PatternIntelligencePanel({
  strong,
  weak,
}: {
  strong: QuantPatternRow[];
  weak: QuantPatternRow[];
}) {
  return (
    <QuantPanelShell
      title="Inteligência de padrões"
      subtitle="Padrões assertivos, falsos positivos e combinações fortes"
    >
      <div className="gp-quant-cols">
        <PatternTable title="Mais assertivos" rows={strong} variant="strong" />
        <PatternTable title="Mais falsos" rows={weak} variant="weak" />
      </div>
    </QuantPanelShell>
  );
}
