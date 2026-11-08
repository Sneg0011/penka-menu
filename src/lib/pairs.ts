import { menu } from "@/content/menu";
import { pairs } from "@/content/pairs";
import type { Item } from "@/content/types";

export type PairPick = { item: Item; share: number };

/** Что чаще всего берут вместе с позицией `itemId`: самые частые первыми, не больше `limit`. */
export function pairsFor(itemId: string, limit = 2): PairPick[] {
  const found: PairPick[] = [];
  for (const pair of pairs) {
    if (pair.item !== itemId) continue;
    const item = menu.find((i) => i.id === pair.with);
    if (item) found.push({ item, share: pair.share });
  }
  // sort в JS стабильный: при равной доле остаётся порядок из content/pairs.ts
  return found.sort((a, b) => b.share - a.share).slice(0, Math.max(0, limit));
}
