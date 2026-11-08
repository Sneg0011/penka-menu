import type { Allergen, Habit, Item } from "@/content/types";

/** Короткие подписи для чипов в строке и в шторке. */
export const ALLERGEN_LABEL: Record<Allergen, string> = {
  lactose: "лактоза",
  gluten: "глютен",
  nuts: "орехи",
  eggs: "яйца",
  fish: "рыба",
  seafood: "морепродукты",
};

/** Реальные позиции, у которых объёма нет в меню доставки: капучино — «от 200 ₽» с Карт, раф — из отзывов. */
const SIZE_GUESS_IDS: ReadonlySet<string> = new Set(["cappuccino", "raf-pistachio"]);

/** Объём или вес — оценка (придуманная позиция или не из меню доставки). */
export const isSizeApprox = (item: Item): boolean => !item.real || SIZE_GUESS_IDS.has(item.id);

/** Цену показываем с «примерно»: придуманная позиция или реальная без цены в меню доставки. */
export const isPriceApprox = (item: Item): boolean => !item.real || item.priceGuess === true;

/** «250 мл» / «≈ 250 мл». */
export const sizeText = (item: Item): string => (isSizeApprox(item) ? `≈ ${item.size}` : item.size);

/** Напиток меряют объёмом, блюдо — весом. */
export const sizeKind = (item: Item): "Объём" | "Вес" => (/мл/.test(item.size) ? "Объём" : "Вес");

/**
 * Начало фразы об отзывах: «Обычно пьют растворимый с молоком». Подпись привычки подставляется
 * в нижнем регистре; «Вообще не пью кофе» в такую фразу не встаёт — для неё своя формулировка.
 */
export function habitLead(habit: Habit): string {
  return habit.id === "no-coffee" ? "Те, кто вообще не пьёт кофе" : `Обычно пьют ${habit.label.toLowerCase()}`;
}

/**
 * Заголовок подборки по привычке: «Людям, которые обычно пьют растворимый с молоком, понравилось».
 * Подпись в нижнем регистре; все подписи, кроме «Вообще не пью кофе», — это то, что пьют (в винительном падеже
 * они совпадают с именительным), а для «не пью кофе» своя формулировка.
 */
export function habitHeading(habit: Habit): string {
  return habit.id === "no-coffee" ? "Тем, кто не пьёт кофе, понравилось" : `Людям, которые обычно пьют ${habit.label.toLowerCase()}, понравилось`;
}
