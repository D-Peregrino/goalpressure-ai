"use client";

import { ClipboardList } from "lucide-react";

export default function TerminalAuditToggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <label className="gp-audit-toggle">
      <input
        type="checkbox"
        className="gp-audit-toggle__input"
        checked={enabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="gp-audit-toggle__track" aria-hidden />
      <ClipboardList className="gp-audit-toggle__icon h-4 w-4" aria-hidden />
      <span className="gp-audit-toggle__label">Modo Auditoria</span>
    </label>
  );
}
