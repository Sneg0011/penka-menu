import type { Pair } from "./types";

// Демо-данные «часто берут вместе» (в интерфейсе — с пометкой «пример»).
// `share` — доля чеков с `item`, где есть и `with`. В реальной версии считается раз в месяц по чекам кассы.
export const pairs: Pair[] = [
  // кофе
  { item: "cappuccino", with: "croissant-napoleon", share: 0.34 },
  { item: "cappuccino", with: "syrniki", share: 0.27 },
  { item: "cappuccino", with: "croissant-lemon", share: 0.22 },
  { item: "cappuccino", with: "eclair-pistachio", share: 0.14 },
  { item: "latte", with: "croissant-napoleon", share: 0.31 },
  { item: "latte", with: "cheesecake", share: 0.22 },
  { item: "latte", with: "macaron", share: 0.18 },
  { item: "espresso", with: "macaron", share: 0.38 },
  { item: "espresso", with: "wafer-rolls", share: 0.2 },
  { item: "americano", with: "omelet-two-eggs", share: 0.25 },
  { item: "americano", with: "breakfast-lord", share: 0.16 },
  { item: "americano", with: "cake-hausmann", share: 0.12 },
  { item: "flat-white", with: "croissant-lemon", share: 0.21 },
  { item: "flat-white", with: "cake-penka", share: 0.15 },
  { item: "cortado", with: "macaron", share: 0.3 },

  // рафы и авторский
  { item: "raf-pistachio", with: "eclair-pistachio", share: 0.28 },
  { item: "raf-pistachio", with: "macaron", share: 0.2 },
  { item: "raf-pistachio", with: "cake-penka", share: 0.16 },
  { item: "raf-classic", with: "wafer-rolls", share: 0.24 },
  { item: "latte-salted-caramel", with: "cheesecake", share: 0.19 },

  // чай
  { item: "tea-black", with: "cake-hausmann", share: 0.24 },
  { item: "tea-black", with: "croissant-napoleon", share: 0.18 },
  { item: "tea-green", with: "macaron", share: 0.23 },
  { item: "tea-ginger", with: "soup-chicken-noodles", share: 0.18 },
  { item: "tea-seabuckthorn", with: "syrniki", share: 0.2 },

  // холодные
  { item: "mors-cranberry", with: "pancake-caesar", share: 0.32 },
  { item: "mors-cranberry", with: "syrniki-berry", share: 0.2 },
  { item: "mors-cranberry", with: "waffle-cheese-chicken", share: 0.17 },
  { item: "mors-currant", with: "syrniki-berry", share: 0.25 },
  { item: "fresh-orange", with: "breakfast-fitness", share: 0.3 },
  { item: "fresh-orange", with: "shakshuka", share: 0.22 },
  { item: "fresh-orange", with: "oatmeal-water", share: 0.15 },
  { item: "iced-latte", with: "waffle-viennese", share: 0.2 },
  { item: "iced-latte", with: "pancake-caesar", share: 0.15 },
  { item: "lemonade", with: "salad-caesar", share: 0.2 },

  // еда → напиток
  { item: "syrniki", with: "cappuccino", share: 0.33 },
  { item: "cheesecake", with: "latte", share: 0.27 },
  { item: "wok-shrimp", with: "mors-cranberry", share: 0.18 },
  { item: "carbonara", with: "lemonade", share: 0.15 },
  { item: "waffle-viennese", with: "latte", share: 0.29 },
];
