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
  tagline: "Terminal de Inteligência Quantitativa para Futebol ao Vivo",
  subtitle:
    "Detecte pressão ofensiva, distorções de odds e janelas de execução em tempo real com uma engine proprietária de leitura contextual.",
  domain: "goalpressure.com.br",
} as const;

export const ENGINES = [
  { id: "pressure", name: "Pressure Engine", desc: "Índice de pressão ofensiva em tempo real." },
  { id: "temporal", name: "Temporal Dynamics", desc: "Fase do jogo, urgência e janelas temporais." },
  { id: "player", name: "Player Impact", desc: "Impacto de jogadores e resistência defensiva." },
  { id: "microevent", name: "Microevent Detection", desc: "Ondas de ataque e bursts de caos." },
  { id: "sequence", name: "Sequence Memory", desc: "Memória de sequências e momentum falso." },
  { id: "market", name: "Market Calibration", desc: "Edge, fair odd e distorção de mercado." },
  { id: "signal", name: "Signal Decision", desc: "Gatilho quantitativo com EV mínimo." },
  { id: "backtest", name: "Backtesting", desc: "Validação histórica institucional." },
  { id: "meta", name: "Meta Consensus", desc: "Consenso entre motores e execution grade." },
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
  "SportMonks",
  "Runtime",
  "Engines Quantitativas",
  "Meta Consensus",
  "Telegram / Dashboard",
] as const;

export const AUDIENCE = [
  "Traders esportivos",
  "Analistas quantitativos",
  "Grupos premium",
  "Operações de live betting",
  "Criadores de conteúdo esportivo",
] as const;

export const PRICING = [
  { name: "Beta fechado", price: "Convite", desc: "Acesso antecipado ao terminal live." },
  { name: "Pro", price: "Em breve", desc: "Command center completo e alertas." },
  { name: "Institutional", price: "Custom", desc: "SLA, API dedicada e calibração." },
] as const;
