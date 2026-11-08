import { reviews } from "@/content/habits";
import { menu } from "@/content/menu";
import type { Item } from "@/content/types";

export type HabitPick = { item: Item; votes: number; nuances: string[] };

/**
 * Подборка напитков под привычку: только те, о которых есть отзывы этой привычки.
 * Голос = один отзыв. Порядок: больше голосов выше, при равенстве — как в меню.
 */
export function drinksForHabit(habitId: string): HabitPick[] {
  const picks = new Map<string, HabitPick>();
  for (const review of reviews) {
    if (review.habit !== habitId) continue;
    const pick = picks.get(review.item);
    if (pick) {
      pick.votes += 1;
      pick.nuances.push(review.nuance);
      continue;
    }
    const item = menu.find((i) => i.id === review.item);
    if (item) picks.set(item.id, { item, votes: 1, nuances: [review.nuance] });
  }

  const order = new Map(menu.map((item, index) => [item.id, index]));
  return [...picks.values()].sort((a, b) => b.votes - a.votes || order.get(a.item.id)! - order.get(b.item.id)!);
}
