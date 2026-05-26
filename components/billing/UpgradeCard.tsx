"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { fetchWithAuth } from "@/lib/auth/fetchWithAuth";
import { aplicarCupom } from "@/lib/subscription/coupons";
import {
  formatarPreco,
  PLANO_FUNDADOR_CENTAVOS,
  planoPorId,
  UNICO_PLANO_COMPRAVEL,
  CUPOM_BARBOSATIPS75,
} from "@/lib/subscription/plans";

export default function UpgradeCard({
  initialCoupon,
  showCouponField = true,
}: {
  initialCoupon?: string;
  showCouponField?: boolean;
}) {
  const { user } = useAuth();
  const [cupom, setCupom] = useState(initialCoupon ?? "");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const plano = planoPorId(UNICO_PLANO_COMPRAVEL)!;
  const aplicado = aplicarCupom(cupom, PLANO_FUNDADOR_CENTAVOS);

  async function assinar() {
    setErro(null);
    setLoading(true);
    try {
      if (!user) {
        window.location.href = `/cadastro?cupom=${encodeURIComponent(cupom)}&redirect=/precos`;
        return;
      }
      const res = await fetchWithAuth("/api/billing/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: UNICO_PLANO_COMPRAVEL, couponCode: cupom }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error ?? "Não foi possível iniciar o pagamento.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="gp-upgrade-card">
      <span className="gp-upgrade-card__badge">{plano.badge}</span>
      <h3 className="gp-upgrade-card__title">{plano.nome}</h3>
      <p className="gp-upgrade-card__desc">{plano.descricao}</p>

      <div className="gp-upgrade-card__price">
        <p className="gp-upgrade-card__from">
          De <s>{formatarPreco(PLANO_FUNDADOR_CENTAVOS)}/mês</s>
        </p>
        {aplicado ? (
          <p className="gp-upgrade-card__final">
            Com {aplicado.nomeAmigavel}:{" "}
            <strong>{formatarPreco(aplicado.valorFinalCentavos)}/mês</strong>
          </p>
        ) : (
          <p className="gp-upgrade-card__final">
            <strong>{formatarPreco(PLANO_FUNDADOR_CENTAVOS)}/mês</strong>
          </p>
        )}
      </div>

      <ul className="gp-upgrade-card__features">
        {plano.recursos.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>

      {showCouponField && (
        <label className="gp-upgrade-card__cupom">
          Cupom
          <input
            type="text"
            placeholder={CUPOM_BARBOSATIPS75}
            value={cupom}
            onChange={(e) => setCupom(e.target.value)}
          />
        </label>
      )}

      {erro && <p className="gp-upgrade-card__erro">{erro}</p>}

      <button
        type="button"
        className="gp-btn gp-btn--primary w-full"
        disabled={loading}
        onClick={assinar}
      >
        {loading ? "Processando…" : user ? "Ativar Plano Fundador" : "Entrar como fundador"}
      </button>

      {!user && (
        <p className="gp-upgrade-card__login">
          Já tem conta? <Link href="/entrar">Entrar</Link>
        </p>
      )}

      <p className="gp-upgrade-card__legal">
        Plataforma de leitura esportiva. Não garante resultados financeiros.
      </p>
    </article>
  );
}
