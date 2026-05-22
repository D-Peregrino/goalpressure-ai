/**
 * GoalPressure AI — posicionamento e copy oficial (UI).
 */

/** Paleta light terminal premium (logo: vermelho, branco, preto) */
export const COLORS = {
  white: "#F5F7FA",
  whiteTech: "#EEF2F6",
  grayLight: "#DCE3EA",
  grayInterface: "#C8D0D9",
  graphite: "#20262E",
  red: "#FF2B2B",
  redGlow: "#FF4D4D",
} as const;

export const BRAND = {
  name: "GoalPressure AI",
  tagline: "A central que sabe o que importa no jogo",
  subtitle:
    "Pressão ao vivo, oportunidades e narrativa clara — para decidir em segundos, não em planilhas.",
  domain: "goalpressure.com.br",
} as const;

export const ENGINES = [
  { id: "pressure", name: "Intensidade ofensiva", desc: "Força de ataque e pressão em tempo real." },
  { id: "temporal", name: "Ritmo do jogo", desc: "Fase, urgência e janelas do confronto." },
  { id: "player", name: "Impacto em campo", desc: "Jogadores e resistência defensiva." },
  { id: "microevent", name: "Ondas de ataque", desc: "Rajadas e ritmo imprevisível." },
  { id: "sequence", name: "Sequências", desc: "Memória de jogadas e impulso falso." },
  { id: "market", name: "Leitura de mercado", desc: "Vantagem, odd justa e distorção." },
  { id: "signal", name: "Decisão de entrada", desc: "Quando vale agir no mercado." },
  { id: "backtest", name: "Histórico", desc: "Validação em dados passados." },
  { id: "meta", name: "Consenso", desc: "Combinação dos motores de leitura." },
] as const;

export const DETECTIONS = [
  "Pressão ofensiva",
  "Distorção de odds",
  "Caos ofensivo",
  "Momentum",
  "Janelas de execução",
  "Edge de mercado",
] as const;

export const PIPELINE = [
  "Dados ao vivo",
  "Leitura em tempo real",
  "Motores esportivos",
  "Consenso",
  "Alertas e central",
] as const;

export const AUDIENCE = [
  "Apostadores ao vivo",
  "Analistas esportivos",
  "Grupos premium",
  "Operações de live",
  "Criadores de conteúdo",
] as const;

export const PRICING = [
  {
    name: "Free",
    price: "R$ 0",
    desc: "Até 6 jogos, pressão básica e prévia do que o Pro desbloqueia.",
    tier: "free" as const,
    cta: "Começar grátis",
    href: "/terminal",
  },
  {
    name: "Pro",
    price: "R$ 297/mês",
    desc: "Central completa, hero, alertas, timeline e leitura tática — trial 7 dias.",
    tier: "pro" as const,
    cta: "Trial Pro",
    href: "/signup?plan=pro",
    featured: true,
  },
  {
    name: "Elite",
    price: "R$ 697/mês",
    desc: "Modo operador, auditoria e prioridade máxima — trial 14 dias.",
    tier: "institutional" as const,
    cta: "Trial Elite",
    href: "/signup?plan=institutional",
  },
] as const;

export const COMMERCIAL_VALUE = [
  {
    title: "Leitura operacional",
    desc: "Uma linha por jogo: o que o sistema vê agora, sem jargão técnico.",
  },
  {
    title: "Central viva",
    desc: "Hero, alertas e ranking de calor conduzem sua atenção ao vivo.",
  },
  {
    title: "Vantagem contextual",
    desc: "Pressão + mercado num só lugar — quando vale agir fica explícito.",
  },
] as const;
