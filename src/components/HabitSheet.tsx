"use client";

import { useId, type CSSProperties } from "react";

import { habits } from "@/content/habits";
import { habitHeading } from "@/lib/facts";
import { drinksForHabit } from "@/lib/recommend";
import { sectionTheme } from "@/lib/theme";

import { sectionStyle } from "./MenuSection";
import { ItemRow } from "./ItemRow";
import { Sheet } from "./Sheet";

type Props = {
  /** Чья подборка; `null` — шторка закрыта и ничего не рисует. */
  habitId: string | null;
  onClose: () => void;
  /** Тап по строке: страница открывает карточку позиции поверх подборки. */
  onOpenItem: (id: string) => void;
};

/**
 * Шторка «Людям, которые обычно пьют …, понравилось»: напитки по числу голосов (сначала самые популярные)
 * и под каждым — нюансы теми словами, которыми их написали гости. Отзывы придуманы для концепта,
 * поэтому под заголовком пометка «отзывы — пример».
 * Каждая позиция — карточка в цветах своего раздела (как в меню): рисунки подобраны под эти цвета,
 * а контраст текста на них проверен. Строка — тот же `ItemRow`, что и в меню; тап открывает карточку поверх.
 */
export function HabitSheet({ habitId, onClose, onOpenItem }: Props) {
  const titleId = useId();
  const habit = habitId === null ? undefined : habits.find((h) => h.id === habitId);
  return (
    <Sheet open={habit !== undefined} onClose={onClose} labelledBy={titleId} resetKey={habit?.id ?? null}>
      {habit && (
        <div className="pt-1 pb-2">
          <h2 id={titleId} className="text-[22px] leading-[1.18] font-semibold tracking-[-0.01em] text-balance">
            {habitHeading(habit)}
          </h2>
          <p className="pk-muted mt-2 text-[13px] leading-5">сначала самые популярные · отзывы — пример</p>
          <ul role="list" className="mt-5 flex flex-col gap-3">
            {drinksForHabit(habit.id).map(({ item, nuances }) => {
              const section = sectionTheme(item.section);
              return (
                <li
                  key={item.id}
                  data-testid="habit-item"
                  data-name={item.name}
                  data-tone={section.tone}
                  style={{ ...sectionStyle(section), background: `linear-gradient(160deg, ${section.bg[0]}, ${section.bg[1]})` } as CSSProperties}
                  className="overflow-hidden rounded-[20px]"
                >
                  <ItemRow item={item} onOpen={onOpenItem} />
                  <ul role="list" className="mx-4 flex flex-col gap-2.5 border-t border-current/15 pt-3 pb-4">
                    {nuances.map((nuance) => (
                      <li key={nuance} className="pk-quote text-[14px] leading-[1.45]">
                        {nuance}
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Sheet>
  );
}
