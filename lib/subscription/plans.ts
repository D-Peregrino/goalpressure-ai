/**
 * Planos comerciais GoalPressure — catálogo em português (Brasil).
 * Apenas Plano Fundador está liberado para compra.
 */

export type PlanId = "gratuito" | "fundador" | "profissional" | "elite";

export interface CommercialPlan {
  id: PlanId;
  /** Slug persistido no banco */
  dbPlan: "free" | "fundador" | "pro" | "elite";
  nome: string;
  precoMensalCentavos: number;
  descricao: string;
  recursos: string[];
  disponivel: boolean;
  destaque?: boolean;
  badge?: string;
}

export const PLANO_FUNDADOR_CENTAVOS = 4900;
export const CUPOM_BARBOSATIPS75 = "BARBOSATIPS75";
export const CUPOM_BARBOSATIPS75_LABEL = "BarbosaTips75";
export const CUPOM_BARBOSATIPS75_DESCONTO = 75;

export function precoComCupom(centavos: number, descontoPercent: number): number {
  return Math.round(centavos * (1 - descontoPercent / 100));
}

export function formatarPreco(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export const PLANOS: CommercialPlan[] = [
  {
    id: "gratuito",
    dbPlan: "free",
    nome: "Gratuito",
    precoMensalCentavos: 0,
    descricao: "Conheça a central com até 6 jogos e leitura básica.",
    recursos: [
      "Até 6 jogos na central",
      "Pressão ofensiva básica",
      "Favoritos",
      "Prévia de alertas",
    ],
    disponivel: true,
  },
  {
    id: "fundador",
    dbPlan: "fundador",
    nome: "Plano Fundador",
    precoMensalCentavos: PLANO_FUNDADOR_CENTAVOS,
    descricao: "Acesso completo de lançamento — vagas limitadas.",
    recursos: [
      "Central ao vivo ilimitada",
      "Hero e alertas avançados",
      "Linha do tempo completa",
      "Leitura tática",
      "Modo auditoria",
      "Suporte prioritário",
    ],
    disponivel: true,
    destaque: true,
    badge: "Lançamento",
  },
  {
    id: "profissional",
    dbPlan: "pro",
    nome: "Profissional",
    precoMensalCentavos: 9700,
    descricao: "Para operação diária com todos os recursos Pro.",
    recursos: [
      "Tudo do Fundador",
      "Relatórios avançados",
      "Integrações futuras",
    ],
    disponivel: false,
    badge: "Em breve",
  },
  {
    id: "elite",
    dbPlan: "elite",
    nome: "Elite",
    precoMensalCentavos: 29700,
    descricao: "Operação institucional e prioridade máxima.",
    recursos: [
      "Tudo do Profissional",
      "Modo operador",
      "API dedicada",
    ],
    disponivel: false,
    badge: "Em breve",
  },
];

export function planoPorId(id: PlanId): CommercialPlan | undefined {
  return PLANOS.find((p) => p.id === id);
}

export function planoPorDbPlan(db: string): CommercialPlan | undefined {
  return PLANOS.find((p) => p.dbPlan === db);
}

export const UNICO_PLANO_COMPRAVEL: PlanId = "fundador";

export function planoPodeComprar(id: PlanId): boolean {
  return id === UNICO_PLANO_COMPRAVEL && (planoPorId(id)?.disponivel ?? false);
}
