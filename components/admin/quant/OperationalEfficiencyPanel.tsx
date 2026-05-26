"use client";

import type { QuantOperationalEfficiency } from "@/lib/admin/quant/quant.types";
import { QuantMetricGrid, QuantPanelShell } from "./QuantPanelShell";

export default function OperationalEfficiencyPanel({
  data,
}: {
  data: QuantOperationalEfficiency;
}) {
  return (
    <QuantPanelShell
      title="Eficiência operacional"
      subtitle="Alertas, Telegram, timing e monitoramentos válidos"
    >
      <QuantMetricGrid
        items={[
          { label: "Alertas enviados", value: data.alertsSent },
          { label: "Alertas bloqueados", value: data.alertsBlocked },
          { label: "Telegram (est.)", value: data.telegramEstimate },
          { label: "Antecipação média", value: `${data.avgAnticipationMin} min` },
          { label: "Monitoramentos válidos", value: data.validMonitorings },
          { label: "Precisão contextual", value: `${data.contextualPrecisionPct}%` },
        ]}
      />
    </QuantPanelShell>
  );
}
