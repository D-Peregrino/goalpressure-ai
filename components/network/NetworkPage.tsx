"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Activity, Network, Radio, Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNetworkExchange } from "@/hooks/useNetworkExchange";
import { useLiveMatches } from "@/hooks/useLiveMatches";
import { useOperationalWorkspace } from "@/hooks/useOperationalWorkspace";
import { loginUrl } from "@/lib/auth/routes";
import { buildMarketConsensus } from "@/lib/network/marketConsensus";
import { formatCollectiveMonitorLine } from "@/lib/network/telegramCollectiveLine";
import { matchListLabel } from "@/lib/ux/hotMatches";
import type { PostSignalInput, SharedSignalType } from "@/lib/network/network.types";
import ConsensusPanel from "@/components/network/ConsensusPanel";
import CollectivePressureMap from "@/components/network/CollectivePressureMap";
import NetworkFeed from "@/components/network/NetworkFeed";
import OperatorLeaderboard from "@/components/network/OperatorLeaderboard";
import SharedSignalsPanel from "@/components/network/SharedSignalsPanel";
import "@/app/styles/network.css";

export default function NetworkPage() {
  const { user } = useAuth();
  const net = useNetworkExchange();
  const op = useOperationalWorkspace();
  const { matches } = useLiveMatches({ pollIntervalMs: 30_000 });

  const [selectedFixture, setSelectedFixture] = useState<string | null>(null);
  const [signalType, setSignalType] = useState<SharedSignalType>("reading");
  const [body, setBody] = useState("");

  const feed = net.feed;
  const consensus = feed?.consensus ?? [];
  const market = useMemo(() => buildMarketConsensus(consensus), [consensus]);

  const topContext = consensus[0] ?? null;
  const collectiveLine = formatCollectiveMonitorLine(topContext);

  const livePick = useMemo(() => {
    const fromWatch = op.operational.watchlist[0];
    if (fromWatch) {
      const m = matches.find(
        (x) =>
          String(x.externalId ?? x.id) === fromWatch.fixtureId ||
          String(x.id) === fromWatch.fixtureId
      );
      return {
        fixtureId: fromWatch.fixtureId,
        matchLabel: fromWatch.matchLabel ?? (m ? matchListLabel(m) : `Jogo ${fromWatch.fixtureId}`),
        league: m?.league ?? undefined,
        gpiScore: m ? Math.round(m.pressure.score) : undefined,
        minute: m?.minute ?? undefined,
        pressureScore: m ? Math.round(m.pressure.score) : undefined,
      };
    }
    const live = matches.find((m) => m.status === "LIVE" || m.status === "HALFTIME");
    if (!live) return null;
    return {
      fixtureId: String(live.externalId ?? live.id),
      matchLabel: matchListLabel(live),
      league: live.league ?? undefined,
      gpiScore: Math.round(live.pressure.score),
      minute: live.minute ?? undefined,
      pressureScore: Math.round(live.pressure.score),
    };
  }, [matches, op.operational.watchlist]);

  async function handleShare() {
    if (!livePick || !body.trim()) return;
    const input: PostSignalInput = {
      fixtureId: selectedFixture ?? livePick.fixtureId,
      matchLabel: livePick.matchLabel,
      league: livePick.league,
      signalType,
      body,
      minute: livePick.minute,
      gpiScore: livePick.gpiScore,
      pressureScore: livePick.pressureScore,
    };
    const ok = await net.postSignal(input);
    if (ok) setBody("");
  }

  if (net.loading && !feed) {
    return (
      <div className="gp-net">
        <div className="gp-net-skeleton" />
        <div className="gp-net-grid">
          <div className="gp-net-skeleton" />
          <div className="gp-net-skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div className="gp-net">
      {!user && (
        <div className="gp-net-banner">
          Entre para compartilhar sinais e votar.{" "}
          <Link href={loginUrl("/network")}>Fazer login</Link>
        </div>
      )}

      <header className="gp-net-hero">
        <div>
          <p className="gp-net-hero__eyebrow">
            <Network className="h-4 w-4" />
            Signal Exchange
          </p>
          <h2 className="gp-net-hero__title">Rede operacional contextual</h2>
          <p className="gp-net-hero__sub">
            Consenso, pressão coletiva e reputação — estilo terminal institucional, sem chat
            aberto.
          </p>
          {collectiveLine && (
            <p className="gp-net-hero__collective">{collectiveLine}</p>
          )}
        </div>
        <div className="gp-net-hero__stats">
          <div className="gp-net-stat">
            <strong>{feed?.signals.length ?? 0}</strong>
            <span>Sinais</span>
          </div>
          <div className="gp-net-stat">
            <strong>{consensus.length}</strong>
            <span>Contextos</span>
          </div>
          <div className="gp-net-stat">
            <strong>{topContext?.consensusScore ?? "—"}</strong>
            <span>Consenso top</span>
          </div>
          <div className="gp-net-stat">
            <strong>{feed?.operators.length ?? 0}</strong>
            <span>Operadores</span>
          </div>
        </div>
      </header>

      <div className="gp-net-workspace-strip">
        <Activity className="h-4 w-4" />
        <div>
          <strong>Workspace integrado</strong>
          <p>
            Watchlist ({op.operational.watchlist.length}) · favoritos · alertas — sincronizados
            com observadores coletivos.
          </p>
        </div>
        <Link href="/workspace" className="gp-net-link-btn">
          Abrir workspace
        </Link>
        <Link href="/terminal" className="gp-net-link-btn gp-net-link-btn--ghost">
          <Radio className="h-3.5 w-3.5" />
          Terminal
        </Link>
      </div>

      {net.canInteract && livePick && (
        <div className="gp-net-compose">
          <label>
            Tipo
            <select
              value={signalType}
              onChange={(e) => setSignalType(e.target.value as SharedSignalType)}
            >
              <option value="reading">Leitura</option>
              <option value="context">Contexto</option>
              <option value="rupture">Ruptura</option>
              <option value="watch">Watchlist</option>
            </select>
          </label>
          <label className="gp-net-compose__grow">
            Sinal sobre {livePick.matchLabel}
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Descreva a leitura operacional (máx. 500 caracteres)"
              maxLength={500}
              rows={2}
            />
          </label>
          <button
            type="button"
            className="gp-net-share-btn"
            disabled={net.posting || !body.trim()}
            onClick={() => void handleShare()}
          >
            <Send className="h-4 w-4" />
            Compartilhar
          </button>
        </div>
      )}

      {net.error && (
        <p className="gp-net-empty" role="alert">
          {net.error}
        </p>
      )}

      <div className="gp-net-grid">
        <div className="gp-net-col gp-net-col--main">
          <SharedSignalsPanel
            signals={feed?.signals ?? []}
            canInteract={net.canInteract}
            onVote={(id, vote) => void net.postVote({ signalId: id, vote })}
          />
          <NetworkFeed
            timeline={feed?.timeline ?? []}
            fixtureFilter={selectedFixture ?? undefined}
          />
        </div>
        <div className="gp-net-col">
          <ConsensusPanel contexts={consensus} hotLeagues={market.hotLeagues} />
          <CollectivePressureMap cells={feed?.heatmap ?? market.emerging} />
          <OperatorLeaderboard operators={feed?.operators ?? []} />
        </div>
      </div>

      {consensus.length > 0 && (
        <div className="gp-net-fixture-pills">
          <button
            type="button"
            className={!selectedFixture ? "active" : ""}
            onClick={() => setSelectedFixture(null)}
          >
            Todos
          </button>
          {consensus.slice(0, 6).map((c) => (
            <button
              key={c.fixtureId}
              type="button"
              className={selectedFixture === c.fixtureId ? "active" : ""}
              onClick={() => setSelectedFixture(c.fixtureId)}
            >
              {c.matchLabel}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
