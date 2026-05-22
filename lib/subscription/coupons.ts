import {
  CUPOM_BARBOSATIPS75,
  CUPOM_BARBOSATIPS75_DESCONTO,
  CUPOM_BARBOSATIPS75_LABEL,
  PLANO_FUNDADOR_CENTAVOS,
  precoComCupom,
} from "@/lib/subscription/plans";

export interface CupomAplicado {
  codigo: string;
  nomeAmigavel: string;
  descontoPercent: number;
  valorOriginalCentavos: number;
  valorFinalCentavos: number;
}

export function normalizarCupom(code: string | null | undefined): string {
  return (code ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

export function aplicarCupom(
  codigo: string | null | undefined,
  valorOriginalCentavos: number = PLANO_FUNDADOR_CENTAVOS
): CupomAplicado | null {
  const norm = normalizarCupom(codigo);
  if (norm === CUPOM_BARBOSATIPS75) {
    return {
      codigo: CUPOM_BARBOSATIPS75,
      nomeAmigavel: CUPOM_BARBOSATIPS75_LABEL,
      descontoPercent: CUPOM_BARBOSATIPS75_DESCONTO,
      valorOriginalCentavos,
      valorFinalCentavos: precoComCupom(valorOriginalCentavos, CUPOM_BARBOSATIPS75_DESCONTO),
    };
  }
  return null;
}
