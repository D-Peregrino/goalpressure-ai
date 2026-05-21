/**
 * Cores determinísticas por time — fallback quando não há cor oficial.
 */

const PALETTE = [
  "#1e3a5f",
  "#7c2d12",
  "#14532d",
  "#4c1d95",
  "#0f766e",
  "#9f1239",
  "#1d4ed8",
  "#b45309",
  "#334155",
  "#be123c",
  "#0369a1",
  "#713f12",
] as const;

function hashName(name: string): number {
  let h = 0;
  const n = name.trim().toLowerCase();
  for (let i = 0; i < n.length; i++) {
    h = (h << 5) - h + n.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function getTeamInitials(teamName: string): string {
  const parts = teamName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

/** Cor de destaque do time (borda, avatar, barra de pressão). */
export function getTeamColor(teamName: string): string {
  const idx = hashName(teamName) % PALETTE.length;
  return PALETTE[idx] ?? PALETTE[0];
}

/** Cor de texto sobre o avatar (contraste). */
export function getTeamTextOnColor(teamName: string): string {
  return "#F5F7FA";
}
