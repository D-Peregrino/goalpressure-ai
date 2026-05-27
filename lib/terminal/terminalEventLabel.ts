/**
 * Rótulos de eventos SportMonks para o modal do terminal (pt-BR).
 */

const TYPE_ID_LABELS: Record<number, string> = {
  10: "VAR",
  11: "Escanteio",
  12: "Escanteio",
  13: "Atendimento médico",
  14: "Gol",
  15: "Gol contra",
  16: "Pênalti",
  17: "Pênalti perdido",
  18: "Substituição",
  19: "Cartão amarelo",
  20: "Cartão vermelho",
  21: "Cartão vermelho",
  22: "Pênalti",
  23: "Pênalti perdido",
  24: "Início de período",
  25: "Fim de período",
};

const CODE_LABELS: Record<string, string> = {
  goal: "Gol",
  own_goal: "Gol contra",
  owngoal: "Gol contra",
  penalty: "Pênalti",
  penalty_goal: "Pênalti",
  missed_penalty: "Pênalti perdido",
  penalty_missed: "Pênalti perdido",
  yellowcard: "Cartão amarelo",
  yellow_card: "Cartão amarelo",
  redcard: "Cartão vermelho",
  red_card: "Cartão vermelho",
  yellowredcard: "Cartão vermelho",
  substitution: "Substituição",
  var: "VAR",
  var_check: "VAR",
  video_assistant_referee: "VAR",
  corner: "Escanteio",
  corners: "Escanteio",
  injury: "Atendimento médico",
  injury_time: "Atendimento médico",
  period_start: "Início de período",
  period_end: "Fim de período",
  kickoff: "Início de período",
  fulltime: "Fim de período",
  halftime: "Intervalo",
};

export function normalizeEventKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function labelFromKey(key: string): string | null {
  if (!key || key === "event") return null;
  if (CODE_LABELS[key]) return CODE_LABELS[key];
  for (const [pattern, label] of Object.entries(CODE_LABELS)) {
    if (key.includes(pattern)) return label;
  }
  return null;
}

export interface TerminalEventLabelInput {
  type_id?: number;
  type?: {
    id?: number;
    name?: string;
    code?: string;
    developer_name?: string;
  };
  detail?: string | null;
  addition?: string | null;
  info?: string | null;
  section?: string | null;
  result?: string | null;
}

/** Nunca retorna "EVENT" — fallback: "Evento da partida". */
export function terminalEventLabel(input: TerminalEventLabelInput | string): string {
  if (typeof input === "string") {
    const fromStr = labelFromKey(normalizeEventKey(input));
    return fromStr ?? "Evento da partida";
  }

  if (input.type_id != null && TYPE_ID_LABELS[input.type_id]) {
    return TYPE_ID_LABELS[input.type_id]!;
  }

  const candidates = [
    input.type?.developer_name,
    input.type?.code,
    input.type?.name,
    input.detail,
    input.addition,
    input.info,
    input.section,
    input.result,
  ].filter((v): v is string => typeof v === "string" && v.trim().length > 0);

  for (const raw of candidates) {
    const label = labelFromKey(normalizeEventKey(raw));
    if (label) return label;
  }

  return "Evento da partida";
}
