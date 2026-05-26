"use client";

import Link from "next/link";
import { Brain, Sparkles, Target, Zap } from "lucide-react";
import type { SmartWorkspacePayload } from "@/lib/personalization/types";
import { profileStyleLabel } from "@/lib/personalization/smartRanking";

function fixtureLink(id: string): string {
  return `/match/${encodeURIComponent(id)}`;
}

export default function SmartWorkspacePanels({
  smart,
  loading,
}: {
  smart: SmartWorkspacePayload | null;
  loading: boolean;
}) {
  if (loading && !smart) {
    return (
      <div className="gp-ws-smart-grid">
        <div className="gp-ws-skeleton gp-ws-span-2" />
        <div className="gp-ws-skeleton" />
        <div className="gp-ws-skeleton" />
      </div>
    );
  }

  if (!smart) return null;

  const { profile, recommendedMatches, compatibleAlerts } = smart;

  return (
    <div className="gp-ws-smart-grid">
      <section className="gp-ws-panel gp-ws-panel--smart gp-ws-span-2">
        <div className="gp-ws-panel__head">
          <h3 className="gp-ws-panel__title">
            <Brain className="h-4 w-4" />
            Seu perfil operacional
          </h3>
          <span className="gp-ws-smart-badge">{profileStyleLabel(profile.operationalStyle)}</span>
        </div>
        <div className="gp-ws-profile-ring">
          <div className="gp-ws-profile-score">
            <strong>{profile.behavioralScore}</strong>
            <span>Score comportamental</span>
          </div>
          <div className="gp-ws-profile-metrics">
            <div>
              <span>Afinidade ao vivo</span>
              <strong>{profile.liveAffinity}%</strong>
            </div>
            <div>
              <span>Pressão preferida</span>
              <strong>{profile.pressurePreference}%</strong>
            </div>
            <div>
              <span>Afinidade GPI</span>
              <strong>{profile.gpiAffinity}%</strong>
            </div>
            <div>
              <span>Telegram</span>
              <strong>{profile.telegramAffinity}%</strong>
            </div>
          </div>
        </div>
        <p className="gp-ws-smart-hint">
          Feed adaptativo:{" "}
          <strong>
            {smart.adaptiveFeedPriority === "pressure"
              ? "prioriza pressão"
              : smart.adaptiveFeedPriority === "favorites"
                ? "prioriza favoritos"
                : "equilíbrio institucional"}
          </strong>
          . O terminal reordena jogos com base no seu histórico — sem alterar motores de leitura.
        </p>
      </section>

      <section className="gp-ws-panel gp-ws-panel--smart">
        <div className="gp-ws-panel__head">
          <h3 className="gp-ws-panel__title">
            <Target className="h-4 w-4" />
            Jogos recomendados para você
          </h3>
        </div>
        {recommendedMatches.length === 0 ? (
          <p className="gp-ws-empty">Interaja com o terminal para gerar recomendações.</p>
        ) : (
          <ul className="gp-ws-list">
            {recommendedMatches.slice(0, 5).map((m) => (
              <li key={m.fixtureId} className="gp-ws-row">
                <div className="gp-ws-row__main">
                  <Link href={fixtureLink(m.fixtureId)} className="gp-ws-row__label">
                    {m.label}
                  </Link>
                  <p className="gp-ws-row__meta">
                    {m.reason} · {m.live ? "ao vivo" : "fora do ar"}
                  </p>
                </div>
                <span className="gp-ws-row__score">{m.personalizedScore}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="gp-ws-panel gp-ws-panel--smart">
        <div className="gp-ws-panel__head">
          <h3 className="gp-ws-panel__title">
            <Zap className="h-4 w-4" />
            Alertas compatíveis com seu comportamento
          </h3>
        </div>
        {compatibleAlerts.length === 0 ? (
          <p className="gp-ws-empty">Alertas personalizados aparecem conforme sua operação.</p>
        ) : (
          <ul className="gp-ws-list">
            {compatibleAlerts.slice(0, 5).map((a) => (
              <li key={a.id} className="gp-ws-row gp-ws-alert--high">
                <div className="gp-ws-row__main">
                  <p className="gp-ws-row__label">{a.matchLabel ?? "Alerta"}</p>
                  <p className="gp-ws-row__meta">
                    {a.message} · compat. {a.compatibilityScore}% · {a.reason}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="gp-ws-smart-hint" style={{ marginTop: "0.75rem" }}>
          <Sparkles className="inline h-3 w-3" /> Integrado com watchlist, ligas favoritas e canal
          Telegram.
        </p>
      </section>
    </div>
  );
}
