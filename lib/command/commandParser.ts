import type { CommandItem } from "@/lib/command/command.types";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim();
}

function scoreToken(haystack: string, query: string): number {
  if (!query) return 1;
  const h = normalize(haystack);
  const q = normalize(query);
  if (h === q) return 100;
  if (h.startsWith(q)) return 80;
  if (h.includes(q)) return 50;
  const words = q.split(/\s+/).filter(Boolean);
  let partial = 0;
  for (const w of words) {
    if (h.includes(w)) partial += 20;
  }
  return partial;
}

/** Parser de busca operacional — estilo Raycast/Linear. */
export function parseAndRankCommands(
  items: CommandItem[],
  query: string
): CommandItem[] {
  const q = query.trim();
  if (!q) {
    return items.map((item) => ({ ...item, score: item.score ?? 0 }));
  }

  const scored = items.map((item) => {
    const titleScore = scoreToken(item.title, q) * 2;
    const subScore = item.subtitle ? scoreToken(item.subtitle, q) : 0;
    const kwScore = Math.max(0, ...item.keywords.map((k) => scoreToken(k, q)));
    const groupScore = scoreToken(item.group, q) * 0.5;
    return {
      ...item,
      score: titleScore + subScore + kwScore + groupScore + (item.score ?? 0),
    };
  });

  return scored
    .filter((item) => (item.score ?? 0) > 0)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

export function groupCommands(items: CommandItem[]): Map<string, CommandItem[]> {
  const map = new Map<string, CommandItem[]>();
  for (const item of items) {
    const list = map.get(item.group) ?? [];
    list.push(item);
    map.set(item.group, list);
  }
  return map;
}
