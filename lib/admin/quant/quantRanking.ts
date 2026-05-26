export function rankByScore<T>(
  rows: T[],
  scoreFn: (row: T) => number,
  limit = 12
): T[] {
  return [...rows].sort((a, b) => scoreFn(b) - scoreFn(a)).slice(0, limit);
}

export function rankByAsc<T>(
  rows: T[],
  scoreFn: (row: T) => number,
  limit = 8
): T[] {
  return [...rows].sort((a, b) => scoreFn(a) - scoreFn(b)).slice(0, limit);
}
