export type SectionId =
  | "coffee"
  | "raf"
  | "tea"
  | "cold"
  | "breakfast"
  | "waffles"
  | "soups"
  | "pasta"
  | "salads"
  | "desserts";

/** `bg` — два цвета градиента раздела; `ink` — цвет текста поверх них. */
export type Section = {
  id: SectionId;
  title: string;
  tone: "dark" | "light";
  bg: [string, string];
  ink: string;
  accent: string;
};

/**
 * Слои идут снизу вверх. `part` — относительная доля слоя в стакане (не миллилитры:
 * 1 часть эспрессо ≈ 30 мл); `color` — свой цвет слоя (сироп, сок, чай, сливки с добавкой).
 */
export type Layer = {
  kind: "espresso" | "water" | "milk" | "foam" | "syrup" | "ice" | "tea" | "juice" | "cream";
  part: number;
  color?: string;
};

export type Vessel = "cup" | "glass" | "tall" | "paper" | "teapot";
export type Dish = "plate" | "bowl" | "deep" | "slice" | "pastry";

export type Art =
  | { type: "drink"; vessel: Vessel; layers: Layer[] }
  | { type: "food"; dish: Dish; ingredients: string[] };

export type Allergen = "lactose" | "gluten" | "nuts" | "eggs" | "fish" | "seafood";

export type Scale = 0 | 1 | 2 | 3;

export type Item = {
  id: string;
  section: SectionId;
  name: string;
  /** Точная цена у реальных позиций, ориентир у придуманных. */
  price: number;
  /** «от 200 ₽» — у капучино. */
  priceFrom?: boolean;
  /** Реальная позиция, но цены в меню доставки нет — `price` оценка (раф «Фисташковый»). */
  priceGuess?: boolean;
  /** Один объём или вес: «400 мл», «250 г». */
  size: string;
  text: string;
  art: Art;
  taste?: { sweet: Scale; bitter: Scale; sour: Scale };
  /** Только у напитков на эспрессо. */
  strength?: Scale;
  kcal: number;
  allergens: Allergen[];
  /** Можно приготовить на растительном молоке. */
  plantMilk?: boolean;
  /** `true` — позиция есть в меню доставки «Пенки»; `false` — придумана для концепта. */
  real: boolean;
};

export type Habit = { id: string; label: string };

/** Отзыв: «обычно пью `habit` → здесь понравилось `item` → `nuance`». */
export type Review = { habit: string; item: string; nuance: string };

/** `share` — доля чеков с `item`, в которых есть и `with` (0…1). */
export type Pair = { item: string; with: string; share: number };
