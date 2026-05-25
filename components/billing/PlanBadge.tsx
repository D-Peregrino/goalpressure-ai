"use client";

import { planLabelPt, type DbPlan } from "@/lib/subscription/permissions";

export default function PlanBadge({
  plan,
  isAdmin = false,
}: {
  plan: DbPlan;
  isAdmin?: boolean;
}) {
  if (isAdmin) {
    return (
      <span className="gp-plan-badge-group">
        <span className="gp-plan-badge gp-plan-badge--admin">Administrador</span>
        <span className="gp-plan-badge gp-plan-badge--fundador">Plano Fundador liberado</span>
      </span>
    );
  }

  if (plan === "fundador") {
    return (
      <span className="gp-plan-badge gp-plan-badge--fundador">Plano Fundador ativo</span>
    );
  }

  return <span className={`gp-plan-badge gp-plan-badge--${plan}`}>{planLabelPt(plan)}</span>;
}
