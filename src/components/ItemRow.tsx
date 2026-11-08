"use client";

import { useId } from "react";

import { ItemArt } from "@/art/ItemArt";
import type { Item } from "@/content/types";
import { isPriceApprox, sizeText } from "@/lib/facts";
import { formatPrice } from "@/lib/price";

import { AllergenChips } from "./AllergenChips";
import { StrengthBars, TasteDots } from "./TasteDots";

type Props = {
  item: Item;
  /** Тап по строке: родитель открывает шторку позиции. */
  onOpen: (id: string) => void;
};

/**
 * Компактная строка меню: рисунок 72 px, название и цена, значки (вкус точками и крепость; объём или вес
 * и калории) и чипы аллергенов. Вся строка — одна кнопка.
 * Название никогда не обрезается: оно переносится (самое длинное — четыре строки на 360 px), а цена плавает справа
 * в первых строках и остаётся целиком на виду; ниже цены название занимает всю колонку.
 * В колонке 244 px значки в одну линию не влезают, поэтому они идут двумя короткими линиями —
 * у всех позиций одинаково.
 * Цвета наследует от раздела: текст — `currentColor`, приглушённый и акцент — `--muted` / `--accent`.
 * Вкус, калории и аллергены везде оценка, поэтому у значков одна пометка «примерно» на строку.
 */
export function ItemRow({ item, onOpen }: Props) {
  const uid = useId();
  const nameId = `${uid}-name`;
  const priceId = `${uid}-price`;
  const priceNoteId = `${uid}-pricenote`;
  const factsId = `${uid}-facts`;

  const priceApprox = isPriceApprox(item);

  return (
    <button
      type="button"
      onClick={() => onOpen(item.id)}
      aria-labelledby={`${nameId} ${priceId}`}
      aria-describedby={priceApprox ? `${priceNoteId} ${factsId}` : factsId}
      className="flex min-h-11 w-full items-start gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-current/[0.04] active:bg-current/[0.07] focus-visible:bg-current/[0.05] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-current/45"
    >
      <span className="shrink-0">
        <ItemArt item={item} size={72} className="block" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flow-root">
          <span className="float-right ml-3 flex flex-col items-end">
            <span id={priceId} className="text-[15px] leading-[1.25] font-semibold whitespace-nowrap tabular-nums">
              {formatPrice(item)}
            </span>
            {priceApprox && (
              <span id={priceNoteId} className="pk-muted text-[11px] leading-4">
                примерно
              </span>
            )}
          </span>
          <span id={nameId} className="block text-[15px] leading-[1.25] font-semibold [overflow-wrap:anywhere]">
            {item.name}
          </span>
        </span>

        <span id={factsId} className="pk-muted mt-1.5 flex flex-col gap-1 text-[11px] leading-4">
          {(item.taste || item.strength !== undefined) && (
            <span className="flex items-center gap-x-2.5">
              {item.taste && <TasteDots taste={item.taste} />}
              {item.strength !== undefined && <StrengthBars value={item.strength} />}
            </span>
          )}
          <span className="flex flex-wrap items-center gap-x-2.5">
            <span className="whitespace-nowrap">{sizeText(item)}</span>
            <span className="whitespace-nowrap">{item.kcal} ккал</span>
            <span className="italic">примерно</span>
          </span>
        </span>

        <span className="mt-1.5 block empty:hidden">
          <AllergenChips allergens={item.allergens} plantMilk={item.plantMilk} />
        </span>
      </span>
    </button>
  );
}
