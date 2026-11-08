import type { Item } from "@/content/types";

/**
 * Цена для экрана. «от 200 ₽» — у позиции с `priceFrom`; «≈ 250 ₽» — придуманная позиция
 * или реальная без цены в меню доставки (`priceGuess`); иначе точная «240 ₽».
 * Пробел обычный (U+0020), не неразрывный.
 */
export function formatPrice(item: Item): string {
  if (item.priceFrom) return `от ${item.price} ₽`;
  if (!item.real || item.priceGuess) return `≈ ${item.price} ₽`;
  return `${item.price} ₽`;
}
