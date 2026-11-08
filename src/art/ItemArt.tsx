import type { Item } from "@/content/types";

import { DrinkArt } from "./DrinkArt";
import { FoodArt } from "./FoodArt";

type Props = {
  item: Item;
  /** Сторона квадрата в px: в карточке ≈ 72–96, в шторке ≈ 200–240. */
  size: number;
  className?: string;
};

/** «250 мл» → 250; у еды объёма нет. */
const millilitres = (size: string) => {
  const match = /(\d+)\s*мл/.exec(size);
  return match ? Number(match[1]) : undefined;
};

/** Рисунок позиции из её данных: напиток — слоями сбоку, еда — сверху на посуде. */
export function ItemArt({ item, size, className }: Props) {
  if (item.art.type === "drink") {
    return <DrinkArt art={item.art} size={size} volume={millilitres(item.size)} className={className} />;
  }
  return <FoodArt art={item.art} size={size} seed={item.id} className={className} />;
}
