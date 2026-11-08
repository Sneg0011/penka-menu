"use client";

import { memo, type CSSProperties } from "react";

import { ItemArt } from "@/art/ItemArt";
import { menu } from "@/content/menu";
import type { Item, Section, SectionId } from "@/content/types";
import { mutedInk } from "@/lib/theme";

import { ItemRow } from "./ItemRow";

type Props = {
  section: Section;
  /** Тап по позиции: страница открывает шторку. Должна быть стабильной (useCallback) — раздел мемоизирован. */
  onOpen: (id: string) => void;
};

/**
 * Обложка раздела: рукописная приписка поверх заголовка (как «coffee» поверх SATURDAY) и рисунки
 * позиций крупно. Приписки — настроение, не обещание; рисунки — настоящие позиции раздела.
 * `flip` — тарелка уходит за левый край, а не за правый: соседние разделы не повторяют друг друга.
 */
const COVER: Record<SectionId, { note: string; art: string[]; flip?: boolean }> = {
  coffee: { note: "с пенкой", art: ["espresso", "cappuccino", "latte"] },
  raf: { note: "на сливках", art: ["raf-lavender", "raf-pistachio"] },
  tea: { note: "согреться", art: ["tea-black", "tea-seabuckthorn"] },
  cold: { note: "освежиться", art: ["lemonade", "mors-cranberry"] },
  breakfast: { note: "доброе утро", art: ["breakfast-penka"] },
  waffles: { note: "хрустят", art: ["waffle-viennese"], flip: true },
  soups: { note: "горячее", art: ["soup-pumpkin"] },
  pasta: { note: "сытно", art: ["carbonara"], flip: true },
  salads: { note: "свежее", art: ["salad-caesar"] },
  desserts: { note: "к кофе", art: ["cake-penka", "macaron"], flip: true },
};

/**
 * Цвета раздела CSS-переменными: `--ink`, `--accent`, `--muted` (проверенный на контраст, см. mutedInk),
 * `--bg-0` / `--bg-1` — фон. Строки меню и чипы берут цвета отсюда.
 */
export function sectionStyle(section: Section) {
  return {
    "--ink": section.ink,
    "--accent": section.accent,
    "--muted": mutedInk(section),
    "--bg-0": section.bg[0],
    "--bg-1": section.bg[1],
    color: section.ink,
  } satisfies Record<string, string>;
}

/** «4 позиции», «6 позиций», «21 позиция». */
export function positionsLabel(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  const word = mod10 === 1 && mod100 !== 11 ? "позиция" : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? "позиции" : "позиций";
  return `${n} ${word}`;
}

const byId = (id: string) => menu.find((i) => i.id === id);

/** Напитки рядом, с лёгким наложением, как чашки на столе; еда — одна тарелка крупно, уходит за край. */
function Cover({ items, flip = false }: { items: Item[]; flip?: boolean }) {
  const drinks = items.every((i) => i.art.type === "drink");
  if (drinks) {
    const size = items.length >= 3 ? 128 : 150;
    return (
      <div className="pk-cover-art pk-cover-art--drinks -mt-6 -mr-2 flex items-end justify-end">
        {items.map((item, k) => (
          <span key={item.id} className="block" style={{ marginLeft: k ? -size * 0.2 : 0 }}>
            <ItemArt item={item} size={size} className="block" />
          </span>
        ))}
      </div>
    );
  }
  const [hero, side] = items;
  return (
    <div className={`pk-cover-art pk-cover-art--food relative flex h-[240px] items-start ${flip ? "-ml-16 justify-start" : "-mr-16 justify-end"}`}>
      {side && (
        <span className={`absolute top-[118px] block ${flip ? "left-[214px]" : "right-[214px]"}`}>
          <ItemArt item={side} size={118} className="block" />
        </span>
      )}
      <ItemArt item={hero} size={248} className="block" />
    </div>
  );
}

/** Раздел меню: обложка (рисунки, заголовок, рукописная приписка, число позиций) и строки позиций. */
export const MenuSection = memo(function MenuSection({ section, onOpen }: Props) {
  const items = menu.filter((i) => i.section === section.id);
  const cover = COVER[section.id];
  const coverItems = cover.art.map(byId).filter((i): i is Item => i !== undefined);
  const titleId = `${section.id}-title`;

  return (
    <section id={section.id} data-tone={section.tone} aria-labelledby={titleId} style={sectionStyle(section) as CSSProperties} className="pk-section">
      <div className="px-5 pt-7 pb-4">
        <Cover items={coverItems} flip={cover.flip} />
        <div className="relative mt-1">
          <h2 id={titleId} className="pk-title font-display relative inline-block min-w-[200px] pr-1 text-[44px] leading-[0.98] font-bold tracking-[-0.035em] text-balance">
            {section.title}
            <span aria-hidden="true" className="pk-note font-script absolute right-0 -bottom-[0.5em] text-[40px] leading-none font-normal tracking-normal whitespace-nowrap">
              {cover.note}
            </span>
          </h2>
          <p className="pk-muted mt-11 text-[14px] leading-5">{positionsLabel(items.length)}</p>
        </div>
      </div>
      <ul role="list" className="pb-12">
        {items.map((item) => (
          <li key={item.id}>
            <ItemRow item={item} onOpen={onOpen} />
          </li>
        ))}
      </ul>
    </section>
  );
});
