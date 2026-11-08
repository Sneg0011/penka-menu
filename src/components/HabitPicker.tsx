"use client";

import { useId, useState } from "react";

import { habits } from "@/content/habits";

type Props = {
  /** Тап по привычке: страница открывает подборку (`HabitSheet`) для неё. */
  onPick: (habitId: string) => void;
};

/**
 * Вход «Что вы обычно пьёте?» на первом экране: семь привычек крупными кнопками в две колонки
 * (последняя, нечётная, — во всю ширину). Тап открывает подборку напитков, которые понравились
 * людям с той же привычкой.
 * Цвета и фон берёт у раздела, в котором стоит (`--ink`, `--accent`, `--bg-0`): на тёмном эспрессо кнопки —
 * чуть светлее фона, с «клавишной» кромкой снизу; при нажатии кромка проваливается. Последняя выбранная
 * привычка остаётся подсвеченной акцентом, пока шторка закрыта, — видно, откуда вернулись.
 * Не <section>: разделами страницы считаются только разделы меню. Внутри — только кнопки, поэтому
 * в статической разметке вход есть до гидратации.
 */
export function HabitPicker({ onPick }: Props) {
  const titleId = useId();
  const [picked, setPicked] = useState<string | null>(null);
  const odd = habits.length % 2 === 1;

  return (
    <div role="group" aria-labelledby={titleId}>
      <h2 id={titleId} className="font-display text-[25px] leading-[1.08] font-bold tracking-[-0.03em] text-balance">
        Что вы обычно пьёте?
      </h2>
      <p className="pk-muted mt-2 text-[14px] leading-5">Покажем, что понравилось тем, кто пьёт так&nbsp;же.</p>
      <ul role="list" className="mt-5 grid grid-cols-2 gap-x-2.5 gap-y-3">
        {habits.map((habit, k) => (
          <li key={habit.id} className={odd && k === habits.length - 1 ? "col-span-2" : undefined}>
            <button
              type="button"
              aria-haspopup="dialog"
              data-picked={picked === habit.id ? "" : undefined}
              onClick={() => {
                setPicked(habit.id);
                onPick(habit.id);
              }}
              className="pk-habit"
            >
              <span>{habit.label}</span>
              <svg aria-hidden="true" viewBox="0 0 8 14" width="8" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="pk-habit-arrow shrink-0">
                <path d="M1 1l6 6-6 6" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
