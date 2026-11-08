import { habits, reviews } from "@/content/habits";
import { menu } from "@/content/menu";
import { pairs } from "@/content/pairs";
import { sections } from "@/content/sections";
import type { Layer } from "@/content/types";

test("10 разделов в порядке дизайна", () => expect(sections.map(s => s.id)).toEqual(["coffee","raf","tea","cold","breakfast","waffles","soups","pasta","salads","desserts"]));
test("в каждом разделе не меньше 4 позиций", () => sections.forEach(s => expect(menu.filter(i => i.section === s.id).length).toBeGreaterThanOrEqual(4)));
test("id уникальны", () => expect(new Set(menu.map(i => i.id)).size).toBe(menu.length));
test("реальные цены как в меню доставки", () => {
  const p = (id: string) => menu.find(i => i.id === id)!.price;
  expect(p("mors-cranberry")).toBe(240); expect(p("fresh-orange")).toBe(760);
  expect(p("wok-shrimp")).toBe(590); expect(p("cake-penka")).toBe(410);
  expect(menu.find(i => i.id === "cappuccino")).toMatchObject({ price: 200, priceFrom: true, real: true });
});
test("раф Фисташковый реальный и с орехами", () => expect(menu.find(i => i.id === "raf-pistachio")).toMatchObject({ real: true, allergens: expect.arrayContaining(["nuts"]) }));
test("7 привычек дословно", () => expect(habits.map(h => h.label)).toEqual(["Растворимый с молоком","Капучино из сетевых кофеен","Чёрный без сахара","Чай","Сладкое с сиропом","Энергетики","Вообще не пью кофе"]));
test("отзывы и пары ссылаются на существующее", () => {
  const ids = new Set(menu.map(i => i.id)); const hs = new Set(habits.map(h => h.id));
  reviews.forEach(r => { expect(ids.has(r.item)).toBe(true); expect(hs.has(r.habit)).toBe(true); });
  pairs.forEach(p => { expect(ids.has(p.item)).toBe(true); expect(ids.has(p.with)).toBe(true); expect(p.share).toBeGreaterThan(0); expect(p.share).toBeLessThanOrEqual(1); });
});
test("на каждую привычку 3–6 отзывов", () => habits.forEach(h => { const n = reviews.filter(r => r.habit === h.id).length; expect(n).toBeGreaterThanOrEqual(3); expect(n).toBeLessThanOrEqual(6); }));
test("у напитков есть вкус и рецепт, у рецепта доли > 0", () => menu.filter(i => i.art.type === "drink").forEach(i => { expect(i.taste).toBeDefined(); (i.art as any).layers.forEach((l: Layer) => expect(l.part).toBeGreaterThan(0)); }));

// --- дополнительные проверки по решениям контроллера ---

const byId = (id: string) => menu.find(i => i.id === id)!;
const milkPart = (id: string) => {
  const art = byId(id).art;
  if (art.type !== "drink") throw new Error(`${id} не напиток`);
  return art.layers.filter(l => l.kind === "milk").reduce((sum, l) => sum + l.part, 0);
};

test("обязательные id позиций на месте", () => {
  ["cappuccino","latte","raf-pistachio","mors-cranberry","fresh-orange","wok-shrimp","cake-penka"].forEach(id => expect(byId(id)).toBeDefined());
});
test("id привычек по порядку", () => expect(habits.map(h => h.id)).toEqual(["instant-milk","chain-cappuccino","black","tea","sweet-syrup","energy","no-coffee"]));
test("у латте есть пара", () => expect(pairs.some(p => p.item === "latte")).toBe(true));
test("в латте молока больше, чем в капучино", () => expect(milkPart("latte")).toBeGreaterThan(milkPart("cappuccino")));
test("раф «Фисташковый»: реальный, цена — оценка, лактоза тоже", () => {
  expect(byId("raf-pistachio")).toMatchObject({ real: true, price: 290, priceGuess: true });
  expect(byId("raf-pistachio").allergens).toContain("lactose");
});
test("priceGuess только у рафа «Фисташковый»", () => expect(menu.filter(i => i.priceGuess).map(i => i.id)).toEqual(["raf-pistachio"]));
test("priceFrom только у капучино", () => expect(menu.filter(i => i.priceFrom).map(i => i.id)).toEqual(["cappuccino"]));
test("кофе, кроме капучино и рафа «Фисташковый», придуманный", () => {
  menu.filter(i => i.section === "coffee" || i.section === "raf").forEach(i => expect(i.real).toBe(i.id === "cappuccino" || i.id === "raf-pistachio"));
});
test("весь реальный список из меню доставки на месте с точными ценами", () => {
  const real: Record<string, number> = {
    "mors-cranberry": 240, "mors-currant": 240, "fresh-orange": 760, "fresh-apple": 720, "fresh-carrot": 500,
    "wafer-rolls": 200, "dessert-raspberry-pistachio": 430, "dessert-curd-blueberry": 380, "choux-ring": 220,
    "croissant-napoleon": 180, "croissant-lemon": 180, macaron: 130, "cake-penka": 410, "cake-hausmann": 380,
    "cheesecake": 430, "eclair-lemon": 260, "eclair-pistachio": 260,
    "breakfast-lord": 690, "buckwheat-poached": 400, "millet-pumpkin": 410, "oatmeal-water": 230, "oatmeal-milk": 260,
    "oatmeal-cream": 320, "breakfast-russian": 590, "breakfast-penka": 710, "breakfast-fitness": 720, shakshuka: 510, "omelet-two-eggs": 250,
    "pancake-caesar": 440, "pancake-mushroom": 480, "waffle-viennese": 460, "waffle-cheese-julienne": 510,
    "waffle-cheese-chicken": 510, "waffle-cheese-trout": 670, "waffle-spinach-julienne": 510,
    "waffle-spinach-chicken": 510, "waffle-spinach-trout": 670, syrniki: 370, "syrniki-berry": 410,
    "wok-shrimp": 590, carbonara: 510, "penne-chicken-mushrooms": 560,
    "salad-green": 510, "salad-caesar": 510, "salad-chicken-veg": 540,
    "soup-chicken-noodles": 350, "soup-chicken-egg": 350,
  };
  Object.entries(real).forEach(([id, price]) => expect(byId(id), id).toMatchObject({ real: true, price }));
  expect(menu.filter(i => i.real).length).toBe(Object.keys(real).length + 2); // + капучино и раф
});
test("у каждой позиции есть размер, описание и цена > 0", () => menu.forEach(i => {
  expect(i.size.length, i.id).toBeGreaterThan(0);
  expect(i.text.length, i.id).toBeGreaterThanOrEqual(55);
  expect(i.text.length, i.id).toBeLessThanOrEqual(115);
  expect(i.price, i.id).toBeGreaterThan(0);
}));
test("описания не содержат запрещённых слов", () => menu.forEach(i => expect(i.text, i.id).not.toMatch(/нежнейш|неповторим/i)));
test("крепость задана у кофе на эспрессо и нигде больше", () => menu.forEach(i => {
  const hasEspresso = i.art.type === "drink" && i.art.layers.some(l => l.kind === "espresso");
  expect(i.strength !== undefined, i.id).toBe(hasEspresso);
}));
test("шкалы вкуса и крепости в пределах 0–3, калории и аллергены заданы", () => menu.forEach(i => {
  [...Object.values(i.taste ?? {}), ...(i.strength === undefined ? [] : [i.strength])].forEach(v => { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(3); });
  expect(i.kcal, i.id).toBeGreaterThan(0);
  expect(Array.isArray(i.allergens), i.id).toBe(true);
}));
test("словарь ингредиентов небольшой и без пустых id", () => {
  const all = new Set(menu.flatMap(i => (i.art.type === "food" ? i.art.ingredients : [])));
  expect(all.size).toBeLessThanOrEqual(40);
  all.forEach(id => expect(id).toMatch(/^[a-z-]+$/));
});
test("у еды есть хотя бы один ингредиент", () => menu.forEach(i => { if (i.art.type === "food") expect(i.art.ingredients.length, i.id).toBeGreaterThan(0); }));
test("растительное молоко — только у напитков с молочным слоем", () => menu.filter(i => i.plantMilk).forEach(i => expect(milkPart(i.id), i.id).toBeGreaterThan(0)));
test("у разделов два цвета фона, тон, текст и акцент в HEX", () => sections.forEach(s => {
  [...s.bg, s.ink, s.accent].forEach(c => expect(c).toMatch(/^#[0-9a-f]{6}$/i));
  expect(s.bg).toHaveLength(2);
  expect(["dark", "light"]).toContain(s.tone);
}));
test("тёмные разделы — кофе и паста, остальные светлые", () => expect(sections.filter(s => s.tone === "dark").map(s => s.id)).toEqual(["coffee", "pasta"]));
test("отзывы разнесены минимум по 12 напиткам", () => expect(new Set(reviews.map(r => r.item)).size).toBeGreaterThanOrEqual(12));
test("отзывы привычек «чай» и «не пью кофе» ведут на безкофейные напитки", () => {
  reviews.filter(r => r.habit === "tea" || r.habit === "no-coffee").forEach(r => {
    const art = byId(r.item).art;
    expect(art.type === "drink" && art.layers.some(l => l.kind === "espresso"), r.item).toBe(false);
  });
});
test("пар не меньше 20 и без повторов", () => {
  expect(pairs.length).toBeGreaterThanOrEqual(20);
  expect(new Set(pairs.map(p => `${p.item}>${p.with}`)).size).toBe(pairs.length);
  pairs.forEach(p => expect(p.item).not.toBe(p.with));
});
