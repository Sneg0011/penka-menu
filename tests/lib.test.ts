import { habits, reviews } from "@/content/habits";
import { menu } from "@/content/menu";
import { sections } from "@/content/sections";
import { drinksForHabit } from "@/lib/recommend";
import { pairsFor } from "@/lib/pairs";
import { contrast, mixColor, sectionTheme } from "@/lib/theme";
import { formatPrice } from "@/lib/price";
import { pairs } from "@/content/pairs";

// ───────── подбор по привычке ─────────

test("подбор по привычке сортирует по голосам", () => { const r = drinksForHabit("instant-milk"); expect(r.length).toBeGreaterThan(0); for (let i = 1; i < r.length; i++) expect(r[i-1].votes).toBeGreaterThanOrEqual(r[i].votes); });
test("неизвестная привычка — пусто", () => expect(drinksForHabit("nope")).toEqual([]));

test("подбор: только напитки с отзывами этой привычки, голоса = число отзывов", () => {
  habits.forEach(h => {
    const mine = reviews.filter(r => r.habit === h.id);
    const result = drinksForHabit(h.id);
    expect(new Set(result.map(r => r.item.id)), h.id).toEqual(new Set(mine.map(r => r.item)));
    result.forEach(r => {
      const own = mine.filter(m => m.item === r.item.id);
      expect(r.votes, `${h.id}/${r.item.id}`).toBe(own.length);
      expect(r.nuances, `${h.id}/${r.item.id}`).toEqual(own.map(m => m.nuance));
      expect(r.item).toBe(menu.find(i => i.id === r.item.id));
    });
  });
});
test("подбор: при равенстве голосов — по порядку в меню", () => {
  const index = (id: string) => menu.findIndex(i => i.id === id);
  habits.forEach(h => {
    const r = drinksForHabit(h.id);
    for (let i = 1; i < r.length; i++) {
      expect(r[i - 1].votes).toBeGreaterThanOrEqual(r[i].votes);
      if (r[i - 1].votes === r[i].votes) expect(index(r[i - 1].item.id), h.id).toBeLessThan(index(r[i].item.id));
    }
  });
});
test("подбор: у «Растворимого с молоком» первым идёт латте с двумя голосами", () => {
  const [first] = drinksForHabit("instant-milk");
  expect(first.item.id).toBe("latte");
  expect(first.votes).toBe(2);
  expect(first.nuances).toHaveLength(2);
});

// ───────── пары ─────────

test("пары по убыванию доли и с лимитом", () => { const r = pairsFor("latte", 2); expect(r.length).toBeLessThanOrEqual(2); if (r.length === 2) expect(r[0].share).toBeGreaterThanOrEqual(r[1].share); });
test("пары: по умолчанию не больше двух, это позиции меню, не сама позиция", () => {
  const r = pairsFor("cappuccino");
  expect(r).toHaveLength(2);
  r.forEach(p => { expect(p.item).toBe(menu.find(i => i.id === p.item.id)); expect(p.item.id).not.toBe("cappuccino"); });
});
test("пары: лимит больше числа пар отдаёт все, по убыванию доли", () => {
  const r = pairsFor("cappuccino", 10);
  expect(r).toHaveLength(pairs.filter(p => p.item === "cappuccino").length);
  expect(r[0]).toMatchObject({ share: 0.34 });
  expect(r[0].item.id).toBe("croissant-napoleon");
  for (let i = 1; i < r.length; i++) expect(r[i - 1].share).toBeGreaterThanOrEqual(r[i].share);
});
test("пары: неизвестная позиция и нулевой лимит — пусто", () => {
  expect(pairsFor("nope")).toEqual([]);
  expect(pairsFor("latte", 0)).toEqual([]);
});

// ───────── цвета и темы ─────────

test("mixColor на краях", () => { expect(mixColor("#000000", "#ffffff", 0)).toBe("#000000"); expect(mixColor("#000000", "#ffffff", 2)).toBe("#ffffff"); });
test("mixColor: t зажат снизу, середина, #rgb, регистр", () => {
  expect(mixColor("#000000", "#ffffff", -3)).toBe("#000000");
  expect(mixColor("#000000", "#ffffff", 0.5)).toBe("#808080");
  expect(mixColor("#000", "#fff", 1)).toBe("#ffffff");
  expect(mixColor("#FF0000", "#00FF00", 0)).toBe("#ff0000");
  expect(mixColor("#ff0000", "#0000ff", 0.25)).toBe("#bf0040");
});
test("mixColor: не-HEX — ошибка", () => expect(() => mixColor("red", "#ffffff", 0.5)).toThrow());

test("текст каждого раздела читается: контраст ≥ 4.5 к обоим цветам фона", () => sections.forEach(s => s.bg.forEach(c => expect(contrast(s.ink, c)).toBeGreaterThanOrEqual(4.5))));
test("акцент каждого раздела читается: контраст ≥ 4.5 к обоим цветам фона", () => sections.forEach(s => s.bg.forEach(c => expect(contrast(s.accent, c), `${s.id} ${c}`).toBeGreaterThanOrEqual(4.5))));
test("contrast: формула WCAG на известных парах", () => {
  expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 10);
  expect(contrast("#ffffff", "#000000")).toBeCloseTo(21, 10);
  expect(contrast("#000", "#fff")).toBeCloseTo(21, 10);
  expect(contrast("#336699", "#336699")).toBeCloseTo(1, 10);
  expect(contrast("#767676", "#ffffff")).toBeGreaterThanOrEqual(4.5);
  expect(contrast("#777777", "#ffffff")).toBeLessThan(4.5);
  expect(contrast("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
});

test("sectionTheme отдаёт раздел по id", () => {
  sections.forEach(s => expect(sectionTheme(s.id)).toBe(s));
  expect(sectionTheme("coffee").tone).toBe("dark");
});
test("sectionTheme: неизвестный id — ошибка", () => expect(() => sectionTheme("nope" as never)).toThrow());

// ───────── цена ─────────

test("цена: от / ≈ / точная", () => {
  expect(formatPrice(menu.find(i => i.id === "cappuccino")!)).toBe("от 200 ₽");
  expect(formatPrice(menu.find(i => i.id === "mors-cranberry")!)).toBe("240 ₽");
  expect(formatPrice(menu.find(i => !i.real)!)).toMatch(/^≈ \d+ ₽$/);
});
test("цена: раф «Фисташковый» — реальный, но цена оценка → «≈ 290 ₽»", () => {
  expect(formatPrice(menu.find(i => i.id === "raf-pistachio")!)).toBe("≈ 290 ₽");
});
test("цена: обычный пробел перед ₽, без неразрывного", () => {
  menu.forEach(i => {
    const s = formatPrice(i);
    expect(s, i.id).toMatch(/^(от |≈ )?\d+ ₽$/);
    expect(s, i.id).not.toContain("\u00a0");
  });
});

// ───────── проверка устройства ─────────

describe("canUseRichMotion", () => {
  const stubbedGetContext = HTMLCanvasElement.prototype.getContext; // заглушка из tests/setup.ts: всегда null
  const stubbedMatchMedia = window.matchMedia;

  const fakeGl = (renderer: string) => ({
    RENDERER: 0x1f01,
    getExtension: (name: string) => (name === "WEBGL_debug_renderer_info" ? { UNMASKED_RENDERER_WEBGL: 0x9246 } : { loseContext: () => {} }),
    getParameter: () => renderer,
  });
  const setGl = (renderer: string | null) => {
    HTMLCanvasElement.prototype.getContext = (() => (renderer === null ? null : fakeGl(renderer))) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  };
  const setCores = (n: number) => Object.defineProperty(navigator, "hardwareConcurrency", { value: n, configurable: true });
  const setSaveData = (saveData: boolean) => Object.defineProperty(navigator, "connection", { value: { saveData }, configurable: true });
  const setReducedMotion = (reduce: boolean) => {
    window.matchMedia = ((query: string) => ({ matches: reduce && query.includes("prefers-reduced-motion"), media: query })) as unknown as typeof window.matchMedia;
  };
  const load = async () => {
    vi.resetModules(); // результат запоминается, поэтому каждому тесту — свежий модуль
    return (await import("@/lib/capability")).canUseRichMotion;
  };

  beforeEach(() => { setCores(8); setSaveData(false); setReducedMotion(false); setGl("ANGLE (Apple, Apple M2, OpenGL 4.1)"); });
  afterEach(() => {
    vi.unstubAllGlobals();
    HTMLCanvasElement.prototype.getContext = stubbedGetContext;
    window.matchMedia = stubbedMatchMedia;
    delete (navigator as unknown as Record<string, unknown>).hardwareConcurrency;
    delete (navigator as unknown as Record<string, unknown>).connection;
  });

  test("с заглушками из setup (холст без WebGL) — false", async () => {
    HTMLCanvasElement.prototype.getContext = stubbedGetContext;
    expect(await (await load())()).toBe(false);
  });
  test("нет WebGL2 — false", async () => { setGl(null); expect(await (await load())()).toBe(false); });
  test("prefers-reduced-motion: reduce — false", async () => { setReducedMotion(true); expect(await (await load())()).toBe(false); });
  test("режим экономии трафика — false", async () => { setSaveData(true); expect(await (await load())()).toBe(false); });
  test("4 ядра и меньше — false", async () => { setCores(4); expect(await (await load())()).toBe(false); });
  test("программный рендер (SwiftShader) — false", async () => { setGl("ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)"); expect(await (await load())()).toBe(false); });
  test("программный рендер (llvmpipe) — false", async () => { setGl("llvmpipe (LLVM 15.0.7, 256 bits)"); expect(await (await load())()).toBe(false); });
  test("5 ядер, видеокарта, анимации не отключены — true", async () => { setCores(5); expect(await (await load())()).toBe(true); });
  test("результат запоминается: тот же промис", async () => {
    const can = await load();
    const first = can();
    setGl(null); // после первой проверки ничего не пересчитывается
    expect(can()).toBe(first);
    expect(await first).toBe(true);
  });
  test("без window (сборка на сервере) — false", async () => {
    const can = await load();
    vi.stubGlobal("window", undefined);
    expect(await can()).toBe(false);
  });
});
