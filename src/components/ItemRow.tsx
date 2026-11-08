"use client";

import { useId } from "react";

import { ItemArt } from "@/art/ItemArt";
import type { Item } from "@/content/types";
import { isPriceApprox, sizeText, tasteWords } from "@/lib/facts";
import { formatPrice } from "@/lib/price";

type Props = {
  item: Item;
  /** Тап по строке: родитель открывает шторку позиции. */
  onOpen: (id: string) => void;
};

/**
 * Компактная строка меню: рисунок 72 px, название и цена, вкус словами («Сладковатый, мягкий»), объём или вес
 * с калориями и — где правда — «можно на растительном». Вся строка — одна кнопка.
 * Точки вкуса, крепость и аллергены — в шторке позиции: в строке они читались как шифр из значков.
 * Название никогда не обрезается: оно переносится (самое длинное — четыре строки на 360 px), а цена плавает справа
 * в первых строках и остаётся целиком на виду; ниже цены название занимает всю колонку.
 * Цвета наследует от раздела: текст — `currentColor`, приглушённый и акцент — `--muted` / `--accent`.
 * Вкус, калории и аллергены везде оценка, поэтому у строки одна пометка «примерно» — в конце строки объёма.
 */
export function ItemRow({ item, onOpen }: Props) {
  const uid = useId();
  const nameId = `${uid}-name`;
  const priceId = `${uid}-price`;
  const priceNoteId = `${uid}-pricenote`;
  const factsId = `${uid}-facts`;

  const priceApprox = isPriceApprox(item);
  const taste = tasteWords(item);

  return (
    <button
      type="button"
      onClick={() => onOpen(item.id)}
      aria-labelledby={`${nameId} ${priceId}`}
      aria-describedby={priceApprox ? `${priceNoteId} ${factsId}` : factsId}
      className="flex min-h-11 w-full items-start gap-3.5 px-4 py-3.5 text-left outline-none transition-colors hover:bg-current/[0.04] active:bg-current/[0.07] focus-visible:bg-current/[0.05] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-current/45"
    >
      <span className="shrink-0">
        <ItemArt item={item} size={72} className="block" />
      </span>

      <span className="min-w-0 flex-1 pt-0.5">
        <span className="flow-root">
          <span className="float-right ml-3 flex flex-col items-end">
            <span id={priceId} className="text-[16px] leading-[1.25] font-semibold whitespace-nowrap tabular-nums">
              {formatPrice(item)}
            </span>
            {priceApprox && (
              <span id={priceNoteId} className="pk-muted text-[11px] leading-4">
                примерно
              </span>
            )}
          </span>
          <span id={nameId} className="block text-[16px] leading-[1.25] font-semibold [overflow-wrap:anywhere]">
            {item.name}
          </span>
        </span>

        <span id={factsId} className="mt-1 flex flex-col gap-0.5 text-[13px] leading-[1.35]">
          {taste && <span className="font-medium">{taste}</span>}
          {/* пробелы — вне скрытых точек: иначе описание кнопки для скринридера склеивается в «300 мл170 ккалпримерно» */}
          <span className="pk-muted">
            <span className="whitespace-nowrap">{sizeText(item)}</span> <span aria-hidden="true">·</span>{" "}
            <span className="whitespace-nowrap">{item.kcal} ккал</span> <span aria-hidden="true">·</span> <span>примерно</span>
          </span>
          {item.plantMilk && <span className="pk-accent text-[12px] font-medium">можно на растительном</span>}
        </span>
      </span>
    </button>
  );
}
