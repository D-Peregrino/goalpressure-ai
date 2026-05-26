"use client";

import { Check, Eye, ShieldAlert } from "lucide-react";
import type { SharedSignal, SignalVoteType } from "@/lib/network/network.types";

const TYPE_LABELS: Record<SharedSignal["signalType"], string> = {
  reading: "Leitura",
  context: "Contexto",
  rupture: "Ruptura",
  watch: "Watchlist",
};

export default function SharedSignalsPanel({
  signals,
  canInteract,
  onVote,
}: {
  signals: SharedSignal[];
  canInteract: boolean;
  onVote: (signalId: string, vote: SignalVoteType) => void;
}) {
  return (
    <section className="gp-net-panel gp-net-panel--wide">
      <header className="gp-net-panel__head">
        <h3>Sinais compartilhados</h3>
        <p>Leituras operacionais — sem tipster, sem green/red</p>
      </header>
      <ul className="gp-net-signals">
        {signals.map((s) => (
          <li key={s.id} className="gp-net-signal">
            <div className="gp-net-signal__meta">
              <span className="gp-net-signal__type">{TYPE_LABELS[s.signalType]}</span>
              <strong>{s.matchLabel}</strong>
              <span>
                {s.operatorName}
                {s.minute != null ? ` · ${s.minute}'` : ""}
                {s.gpiScore != null ? ` · GPI ${s.gpiScore}` : ""}
              </span>
            </div>
            <p className="gp-net-signal__body">{s.body}</p>
            <div className="gp-net-signal__actions">
              <span className="gp-net-votes">
                {s.validateCount} validações · {s.usefulCount} úteis
              </span>
              {canInteract && (
                <>
                  <button
                    type="button"
                    className="gp-net-btn-icon"
                    title="Validar leitura"
                    onClick={() => onVote(s.id, "validate")}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="gp-net-btn-icon"
                    title="Útil"
                    onClick={() => onVote(s.id, "useful")}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="gp-net-btn-icon gp-net-btn-icon--muted"
                    title="Cautela"
                    onClick={() => onVote(s.id, "caution")}
                  >
                    <ShieldAlert className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
      {!signals.length && <p className="gp-net-empty">Nenhum sinal na rede ainda.</p>}
    </section>
  );
}
