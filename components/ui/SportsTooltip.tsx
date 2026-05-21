"use client";

import { memo, useId } from "react";
import { HelpCircle } from "lucide-react";

function SportsTooltipInner({
  label,
  tip,
  children,
}: {
  label?: string;
  tip: string;
  children?: React.ReactNode;
}) {
  const id = useId();

  return (
    <span className="gp-tip-wrap">
      {children ?? (
        <span className="gp-tip-wrap__label">
          {label}
          <HelpCircle className="gp-tip-wrap__icon" aria-hidden />
        </span>
      )}
      <span role="tooltip" id={id} className="gp-tip-wrap__bubble">
        {tip}
      </span>
    </span>
  );
}

export default memo(SportsTooltipInner);
