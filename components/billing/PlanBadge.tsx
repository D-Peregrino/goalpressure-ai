"use client";

import { planLabelPt, type DbPlan } from "@/lib/subscription/permissions";

export default function PlanBadge({ plan }: { plan: DbPlan }) {
  return (
    <span className={`gp-plan-badge gp-plan-badge--${plan}`}>
      {planLabelPt(plan)}
    </span>
  );
}
