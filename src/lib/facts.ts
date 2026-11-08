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

const NOTES: readonly { key: "sweet" | "bitter" | "sour"; words: Partial<Record<number, string>> }[] = [
  { key: "sweet", words: { 2: "сладковатый", 3: "сладкий" } },
  { key: "bitter", words: { 2: "с горчинкой", 3: "горький" } },
  { key: "sour", words: { 2: "с кислинкой", 3: "с яркой кислинкой" } },
];

/**
 * Вкус для строки меню словами, а не значками: «Крепкий, горький», «Сладковатый, мягкий», «С кислинкой».
 * Не больше двух слов: крепость 3 — «крепкий» первым, затем самые выраженные шкалы (от 2 из 3), а мягкий эспрессо
 * (крепость до 1) или напиток без выраженных нот — «мягкий». Без шкал вкуса (еда) — `null`.
 */
export function tasteWords(item: Item): string | null {
  if (!item.taste) return null;
  const parts: string[] = [];
  if (item.strength === 3) parts.push("крепкий");
  const notes = NOTES.map((n, order) => ({ ...n, value: item.taste![n.key], order })).sort((a, b) => b.value - a.value || a.order - b.order);
  for (const n of notes) {
    const word = n.words[n.value];
    if (word && parts.length < 2) parts.push(word);
  }
  if (parts.length < 2 && (parts.length === 0 || (item.strength !== undefined && item.strength <= 1))) parts.push("мягкий");
  const text = parts.join(", ");
  return text[0].toUpperCase() + text.slice(1);
}

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
