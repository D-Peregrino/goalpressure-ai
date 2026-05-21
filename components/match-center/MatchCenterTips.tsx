"use client";

import { memo } from "react";
import { Lightbulb } from "lucide-react";

const TIPS = [
  "O placar e o minuto contam a história — o resto ajuda a antecipar o próximo lance.",
  "Intensidade alta + mercado acelerando = momento em que tudo pode mudar rápido.",
  "Abra «Números do jogo» no radar se quiser estatísticas detalhadas.",
] as const;

function MatchCenterTipsInner() {
  return (
    <aside className="gp-mc-tips" aria-label="Dicas do match center">
      <Lightbulb className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
      <ul>
        {TIPS.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </aside>
  );
}

export default memo(MatchCenterTipsInner);
