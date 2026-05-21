"use client";

import { memo } from "react";
import type { OperationalState } from "@/lib/signals/executionWindow";
import { ESTADO_JOGO, ESTADO_JOGO_DICA } from "@/lib/ux/sportsLanguage";

function OperationalStateBadgeInner({ state }: { state: OperationalState }) {
  return (
    <span
      className={`gp-op-state gp-op-state--${state.toLowerCase()}`}
      title={ESTADO_JOGO_DICA[state]}
    >
      <span className="gp-op-state__dot" aria-hidden />
      {ESTADO_JOGO[state]}
    </span>
  );
}

export default memo(OperationalStateBadgeInner);
