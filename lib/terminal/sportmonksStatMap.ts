/**
 * type_id oficiais — Fixture Team Statistics (SportMonks v3).
 * @see https://docs.sportmonks.com/v3/definitions/types/statistics/fixture-statistics
 *
 * NÃO usar heurística por nome/código — somente estes IDs.
 */

import type { ValidatedStatField } from "@/lib/terminal/validatedStats";

/** IDs oficiais por métrica (fixture team statistics). */
export const SPORTMONKS_STAT_IDS = {
  possession: [45],
  shots_total: [42],
  shots_on_target: [86],
  dangerous_attacks: [44],
  corners: [34],
  yellow_cards: [84],
  /** 83 = red direto; 85 = segundo amarelo */
  red_cards: [83, 85],
} as const;

const TYPE_ID_TO_FIELD: Map<number, ValidatedStatField> = (() => {
  const map = new Map<number, ValidatedStatField>();
  for (const [field, ids] of Object.entries(SPORTMONKS_STAT_IDS)) {
    for (const id of ids) {
      map.set(id, field as ValidatedStatField);
    }
  }
  return map;
})();

/** Resolve campo somente por type_id oficial. */
export function fieldForSportmonksTypeId(typeId: number | undefined | null): ValidatedStatField | null {
  if (typeId == null || !Number.isFinite(typeId)) return null;
  return TYPE_ID_TO_FIELD.get(typeId) ?? null;
}

export function isOfficialSportmonksStatTypeId(typeId: number | undefined | null): boolean {
  return fieldForSportmonksTypeId(typeId) != null;
}
