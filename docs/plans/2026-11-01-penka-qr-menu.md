# QR-меню «Пенки» — план сборки

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Мобильное QR-меню кофейни «Пенка»: ~65 позиций с рисованными иллюстрациями, подбор по привычке, перелив фонов между разделами и 3D-стаканчик — статический сайт-концепт для портфолио AVA.

**Architecture:** Next.js (App Router) со статической выгрузкой. Все данные меню — в `src/content/*`, чистая логика (подбор, пары, темы, проверка устройства) — в `src/lib/*` под юнит-тестами. Тяжёлое (three.js, WebGL-шейдер) — отдельными чанками после первого экрана, с запасным вариантом для слабых устройств.

**Tech Stack:** Next.js ^16.4, React ^19, TypeScript, Tailwind CSS ^4.3, GSAP ^3.15 (ScrollTrigger), three + @react-three/fiber ^9, @fontsource (Unbounded, Onest, Marck Script — кириллица), Vitest + @testing-library/react + jsdom, playwright-core (установленный Chrome, как в `ava-agency-brand/oblako-review`), `qrcode`.

**Spec:** `penka-menu/DESIGN.md`

## Global Constraints

- Проект в `C:\Users\Пухлый\Desktop\Claude MAIN\penka-menu`. Не git-репозиторий: коммитов нет, пока пользователь не попросит.
- `next.config.ts`: `output: "export"`, `images: { unoptimized: true }`. Никаких серверных функций.
- Телефон первым: экран от 360 px. Первый экран — без 3D и шейдера; LCP < 2,5 с на 4G.
- Шрифты только локально через @fontsource, никаких Google Fonts по CDN.
- Ни одной чужой картинки: фото с Яндекс Карт и penka.hce.ru не используются, их логотип не копируется. Все картинки — свои SVG/3D.
- Нет форм, аналитики, cookie.
- Текст футера дословно: «Концепт AVA AGENCY для кофейни „Пенка“. Не официальный сайт. Цены — по меню доставки на 4 октября 2026, в зале могут отличаться». В шапке — чип «концепт AVA».
- Придуманные позиции: цена со знаком «≈» и пометкой «примерно». Вкусовые шкалы, калории, аллергены, отзывы, «берут вместе» — с пометкой «пример»/«примерно».
- Слабые устройства (без WebGL2, программный рендер, `saveData`, `hardwareConcurrency <= 4`, `prefers-reduced-motion`) — градиенты вместо шейдера, SVG-стаканчик вместо 3D.
- Весь интерфейс на русском.

## Review Focus

1. Самые длинные названия («Пенне с куриной грудкой, белыми грибами, шампиньонами в сливочном соусе», «Сырно-шпинатная вафля с форелью») на экране 360 px — строка переносится, цена не уезжает и не обрезается, горизонтальной прокрутки нет. → Task 9, `no-overflow-360`.
2. `prefers-reduced-motion` / нет WebGL — фон раздела всё равно цветной (не белый и не пустой), стаканчик виден. → Task 7, `fallback-without-webgl`.
3. Прыжок каруселью из первого раздела в последний посреди перелива — шапка и карусель встают на тему последнего раздела, без застрявшего полу-перелива. → Task 5, `jump-to-last-section`.
4. Открыл шторку, нажал Escape / тап по подложке — шторка закрывается, прокрутка страницы не заблокирована. → Task 4, `sheet-closes-and-unlocks-scroll`.
5. Медленная сеть — до загрузки 3D на первом экране уже есть вход «Что вы обычно пьёте?» и SVG-стаканчик (в статическом HTML). → Task 8, `hero-in-static-html`.

---

### Task 1: Каркас и данные меню

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `vitest.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx` (заглушка), `src/app/globals.css`
- Create: `src/content/types.ts`, `src/content/sections.ts`, `src/content/menu.ts`, `src/content/habits.ts`, `src/content/pairs.ts`
- Test: `tests/content.test.ts`

**Interfaces:**
- Produces:
  - `type SectionId = "coffee" | "raf" | "tea" | "cold" | "breakfast" | "waffles" | "soups" | "pasta" | "salads" | "desserts"`
  - `type Section = { id: SectionId; title: string; tone: "dark" | "light"; bg: [string, string]; ink: string; accent: string }` — `bg` — два цвета градиента раздела.
  - `type Layer = { kind: "espresso" | "water" | "milk" | "foam" | "syrup" | "ice" | "tea" | "juice" | "cream"; part: number; color?: string }`
  - `type Vessel = "cup" | "glass" | "tall" | "paper" | "teapot"`; `type Dish = "plate" | "bowl" | "deep" | "slice" | "pastry"`
  - `type Art = { type: "drink"; vessel: Vessel; layers: Layer[] } | { type: "food"; dish: Dish; ingredients: string[] }`
  - `type Item = { id: string; section: SectionId; name: string; price: number; priceFrom?: boolean; size: string; text: string; art: Art; taste?: { sweet: 0|1|2|3; bitter: 0|1|2|3; sour: 0|1|2|3 }; strength?: 0|1|2|3; kcal: number; allergens: Allergen[]; plantMilk?: boolean; real: boolean }`
  - `type Allergen = "lactose" | "gluten" | "nuts" | "eggs" | "fish" | "seafood"`
  - `type Habit = { id: string; label: string }`; `type Review = { habit: string; item: string; nuance: string }`
  - `type Pair = { item: string; with: string; share: number }` — `share` — доля чеков с этой позицией (0…1).
  - `export const sections: Section[]`, `menu: Item[]`, `habits: Habit[]`, `reviews: Review[]`, `pairs: Pair[]`
  - id привычек по порядку: `instant-milk`, `chain-cappuccino`, `black`, `tea`, `sweet-syrup`, `energy`, `no-coffee`.
  - Обязательные id позиций (на них опираются тесты): `cappuccino`, `latte`, `raf-pistachio`, `mors-cranberry`, `fresh-orange`, `wok-shrimp`, `cake-penka`. У `latte` есть хотя бы одна пара в `pairs`.

- [ ] **Step 1: Создать проект** — Next.js + TypeScript + Tailwind 4 по стеку выше, `next.config.ts` из Global Constraints, Vitest с jsdom, скрипты `dev` (порт 3220), `build`, `test`.
- [ ] **Step 2: Написать падающий тест `tests/content.test.ts`**

```ts
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
```

- [ ] **Step 3: Запустить** `npm test` — FAIL (нет данных).
- [ ] **Step 4: Наполнить данные.** Реальные позиции, цены, вес/объём — из списка «Меню — состав» в DESIGN.md (реальные — `real: true`), описания своими словами, не копируя тексты Яндекс Еды. Придуманные (курсив в DESIGN.md) — `real: false`. Кофе, кроме капучино и рафа «Фисташковый», — придуманный. Цвета разделов — по таблице «Разделы и цвет» (конкретные HEX — на усмотрение, проверяет Task 2).
- [ ] **Step 5: Запустить** `npm test` — PASS.

### Task 2: Логика — подбор, пары, темы, проверка устройства

**Files:**
- Create: `src/lib/recommend.ts`, `src/lib/pairs.ts`, `src/lib/theme.ts`, `src/lib/capability.ts`
- Test: `tests/lib.test.ts`

**Interfaces:**
- Consumes: всё из Task 1.
- Produces:
  - `drinksForHabit(habitId: string): { item: Item; votes: number; nuances: string[] }[]` — только позиции с отзывами этой привычки, по убыванию `votes`, при равенстве — по порядку в `menu`.
  - `pairsFor(itemId: string, limit = 2): { item: Item; share: number }[]` — по убыванию `share`.
  - `sectionTheme(id: SectionId): Section`; `mixColor(a: string, b: string, t: number): string` (линейно в sRGB, `t` зажат в 0…1); `contrast(fg: string, bg: string): number` (WCAG).
  - `formatPrice(item: Item): string` — реальная: «200 ₽», с `priceFrom`: «от 200 ₽», придуманная: «≈ 250 ₽».
  - `canUseRichMotion(): Promise<boolean>` — порт `detectWebGL` из `oblako-site/src/lib/skyGl.ts` (saveData, ядра ≤ 4, `SOFTWARE_GL` по строке рендерера) плюс `prefers-reduced-motion`. Без проверки кадра в воркере.

- [ ] **Step 1: Написать падающие тесты**

```ts
test("подбор по привычке сортирует по голосам", () => { const r = drinksForHabit("instant-milk"); expect(r.length).toBeGreaterThan(0); for (let i = 1; i < r.length; i++) expect(r[i-1].votes).toBeGreaterThanOrEqual(r[i].votes); });
test("неизвестная привычка — пусто", () => expect(drinksForHabit("nope")).toEqual([]));
test("пары по убыванию доли и с лимитом", () => { const r = pairsFor("latte", 2); expect(r.length).toBeLessThanOrEqual(2); if (r.length === 2) expect(r[0].share).toBeGreaterThanOrEqual(r[1].share); });
test("цена: от / ≈ / точная", () => {
  expect(formatPrice(menu.find(i => i.id === "cappuccino")!)).toBe("от 200 ₽");
  expect(formatPrice(menu.find(i => i.id === "mors-cranberry")!)).toBe("240 ₽");
  expect(formatPrice(menu.find(i => !i.real)!)).toMatch(/^≈ \d+ ₽$/);
});
test("mixColor на краях", () => { expect(mixColor("#000000", "#ffffff", 0)).toBe("#000000"); expect(mixColor("#000000", "#ffffff", 2)).toBe("#ffffff"); });
test("текст каждого раздела читается: контраст ≥ 4.5 к обоим цветам фона", () => sections.forEach(s => s.bg.forEach(c => expect(contrast(s.ink, c)).toBeGreaterThanOrEqual(4.5))));
```

- [ ] **Step 2: Запустить** `npm test` — FAIL.
- [ ] **Step 3: Реализовать** функции с сигнатурами выше. Если тест контраста падает — поправить HEX в `sections.ts`, не порог.
- [ ] **Step 4: Запустить** `npm test` — PASS.

### Task 3: Иллюстрации из данных

**Files:**
- Create: `src/art/DrinkArt.tsx`, `src/art/FoodArt.tsx`, `src/art/ingredients.tsx`, `src/app/dev/art/page.tsx` (галерея всех позиций, в продакшен-меню не ссылается)
- Test: `tests/art.test.tsx`

**Interfaces:**
- Consumes: `Art`, `Layer`, `Item` (Task 1).
- Produces: `<DrinkArt art={DrinkArtData} size={number} />`, `<FoodArt art={FoodArtData} size={number} />`, `<ItemArt item={Item} size={number} />` (выбирает одно из двух). Каждый слой напитка — `<rect data-layer={kind} />` с высотой, пропорциональной `part`. Ингредиенты еды — `<g data-ingredient={name} />`; неизвестное имя рисуется нейтральной «крошкой», а не падает.

- [ ] **Step 1: Написать падающие тесты**

```tsx
test("в латте молока больше, чем в капучино", () => {
  const h = (id: string) => Number(render(<ItemArt item={menu.find(i => i.id === id)!} size={120} />).container.querySelector('[data-layer="milk"]')!.getAttribute("height"));
  expect(h("latte")).toBeGreaterThan(h("cappuccino"));
});
test("каждая позиция рисуется без ошибок", () => menu.forEach(i => expect(() => render(<ItemArt item={i} size={96} />)).not.toThrow()));
test("неизвестный ингредиент не ломает рисунок", () => expect(render(<FoodArt art={{ type: "food", dish: "plate", ingredients: ["xyz"] }} size={96} />).container.querySelector("svg")).not.toBeNull());
```

- [ ] **Step 2: Запустить** `npm test` — FAIL.
- [ ] **Step 3: Реализовать.** Стиль: тёплый плоский рисунок с мягкой тенью и лёгким зерном, вид сверху для тарелок и сбоку для напитков (как референс с тремя чашками). Посуда — `Vessel`/`Dish`; набор ингредиентов покрывает все `ingredients` из `menu.ts`.
- [ ] **Step 4: Запустить** `npm test` — PASS.
- [ ] **Step 5: Проверить глазами** — `npm run dev`, открыть `/dev/art`, скриншот галереи; ни одна позиция не выглядит пустой или «крошкой» вместо задуманного.

### Task 4: Карточка позиции и шторка

**Files:**
- Create: `src/components/ItemRow.tsx`, `src/components/TasteDots.tsx`, `src/components/AllergenChips.tsx`, `src/components/Sheet.tsx`, `src/components/ItemSheet.tsx`
- Test: `tests/item.test.tsx`

**Interfaces:**
- Consumes: `formatPrice`, `pairsFor` (Task 2), `ItemArt` (Task 3), `reviews` (Task 1).
- Produces: `<ItemRow item={Item} onOpen={(id: string) => void} />` — компактная строка: рисунок, название, цена, одна строка значков (вкус точками, крепость, объём/вес, ккал), чипы аллергенов, метка «можно на растительном». `<Sheet open onClose>{children}</Sheet>` — шторка снизу: закрытие по Escape, тапу по подложке и свайпу вниз; пока открыта, `document.body.style.overflow = "hidden"`, после — возвращает прежнее значение. `<ItemSheet itemId={string | null} onClose onOpenItem={(id) => void} />` — полный состав, отзывы по привычкам («Обычно пьют … — …»), «Часто берут вместе» (тап открывает ту позицию), пометки «пример»/«примерно».

- [ ] **Step 1: Написать падающие тесты**

```tsx
test("строка придуманной позиции показывает ≈ и «примерно»", () => { render(<ItemRow item={menu.find(i => !i.real)!} onOpen={() => {}} />); expect(screen.getByText(/^≈ \d+ ₽$/)).toBeInTheDocument(); expect(screen.getAllByText(/примерно/).length).toBeGreaterThan(0); });
test("sheet-closes-and-unlocks-scroll", async () => {
  const onClose = vi.fn(); const { rerender } = render(<Sheet open onClose={onClose}>x</Sheet>);
  expect(document.body.style.overflow).toBe("hidden");
  await userEvent.keyboard("{Escape}"); expect(onClose).toHaveBeenCalled();
  rerender(<Sheet open={false} onClose={onClose}>x</Sheet>); expect(document.body.style.overflow).toBe("");
});
test("тап по паре открывает ту позицию", async () => {
  const onOpenItem = vi.fn(); render(<ItemSheet itemId="latte" onClose={() => {}} onOpenItem={onOpenItem} />);
  const first = pairsFor("latte")[0]; await userEvent.click(screen.getByRole("button", { name: new RegExp(first.item.name) }));
  expect(onOpenItem).toHaveBeenCalledWith(first.item.id);
});
```

- [ ] **Step 2: Запустить** `npm test` — FAIL.
- [ ] **Step 3: Реализовать** компоненты с интерфейсами выше. Шторка — `role="dialog"`, `aria-modal`, фокус внутрь при открытии и обратно при закрытии.
- [ ] **Step 4: Запустить** `npm test` — PASS.

### Task 5: Страница — разделы, карусель, шапка, рамка телефона, футер

**Files:**
- Create: `src/components/PhoneFrame.tsx`, `src/components/Header.tsx`, `src/components/SectionCarousel.tsx`, `src/components/MenuSection.tsx`, `src/components/Footer.tsx`, `src/motion/useSectionProgress.ts`
- Modify: `src/app/page.tsx`
- Create: `scripts/shots.mjs` (playwright-core, установленный Chrome; сценарии и скриншоты в `scripts/shots/`)
- Test: `tests/page.test.tsx`

**Interfaces:**
- Consumes: Task 1–4.
- Produces: `useSectionProgress(): { index: number; next: number; t: number }` — текущий раздел, следующий и доля перехода 0…1 по прокрутке; `<SectionCarousel active={number} onPick={(index) => void} />` — текущий крупно по центру, соседи по бокам, свайп; `<Header theme={Section} />` — с чипом «концепт AVA», перекрашивается под тему; `<PhoneFrame>` — на ширине ≥ 768 px телефон 390×844 по центру с фоном вокруг, на телефоне — без рамки; `<Footer />` — текст из Global Constraints дословно. Каждая секция — `<section id={sectionId} data-tone={tone}>`.

- [ ] **Step 1: Написать падающие тесты**

```tsx
test("футер дословно", () => { render(<Footer />); expect(screen.getByText("Концепт AVA AGENCY для кофейни „Пенка“. Не официальный сайт. Цены — по меню доставки на 4 октября 2026, в зале могут отличаться")).toBeInTheDocument(); });
test("в шапке чип концепта", () => { render(<Header theme={sections[0]} />); expect(screen.getByText("концепт AVA")).toBeInTheDocument(); });
test("на странице все позиции", () => { render(<Page />); menu.forEach(i => expect(screen.getAllByText(i.name).length).toBeGreaterThan(0)); });
```

- [ ] **Step 2: Запустить** `npm test` — FAIL.
- [ ] **Step 3: Реализовать.** Карусель и меню связаны в обе стороны: прокрутка двигает карусель (через `useSectionProgress`), тап по разделу — плавная прокрутка к `#id`. Шапка берёт тему текущего раздела. Здесь же — типографика и стиль из DESIGN.md: шрифты @fontsource (Unbounded — заголовки разделов, Onest — текст, Marck Script — рукописный акцент поверх заголовка, как «coffee» на SATURDAY), журнальная подача, тёплые мягкие тени; держать скилл design-taste-frontend.
- [ ] **Step 4: Запустить** `npm test` — PASS.
- [ ] **Step 5: Сценарий `jump-to-last-section` в `scripts/shots.mjs`** — 390×844: тап по последнему разделу в карусели, ждать окончания прокрутки, проверить, что `header` имеет цвет текста `sections.at(-1).ink` и активный пункт карусели — «Десерты». Run: `node scripts/shots.mjs jump-to-last-section` → `ok`.

### Task 6: Подбор по привычке

**Files:**
- Create: `src/components/HabitPicker.tsx`, `src/components/HabitSheet.tsx`
- Modify: `src/app/page.tsx` (вход на первом экране)
- Test: `tests/habit.test.tsx`

**Interfaces:**
- Consumes: `habits`, `drinksForHabit` (Task 2), `Sheet`, `ItemRow` (Task 4).
- Produces: `<HabitPicker onPick={(habitId) => void} />` — заголовок «Что вы обычно пьёте?» и 7 кнопок; `<HabitSheet habitId={string | null} onClose onOpenItem />` — «Людям, которые обычно пьют {label}, понравилось», список `ItemRow` по `drinksForHabit` с нюансами, пометка «отзывы — пример».

- [ ] **Step 1: Написать падающие тесты**

```tsx
test("7 кнопок привычек", () => { render(<HabitPicker onPick={() => {}} />); expect(screen.getByText("Что вы обычно пьёте?")).toBeInTheDocument(); expect(screen.getAllByRole("button")).toHaveLength(7); });
test("подборка в порядке drinksForHabit и с пометкой", () => {
  render(<HabitSheet habitId="instant-milk" onClose={() => {}} onOpenItem={() => {}} />);
  const names = drinksForHabit("instant-milk").map(r => r.item.name);
  expect(screen.getAllByTestId("habit-item").map(e => e.dataset.name)).toEqual(names);
  expect(screen.getByText(/отзывы — пример/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Запустить** `npm test` — FAIL.
- [ ] **Step 3: Реализовать.**
- [ ] **Step 4: Запустить** `npm test` — PASS.

### Task 7: Перелив фона между разделами

**Files:**
- Create: `src/motion/PourBackground.tsx`, `src/motion/pourShader.ts`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `useSectionProgress` (Task 5), `sections`, `mixColor`, `canUseRichMotion` (Task 2).
- Produces: `<PourBackground />` — фиксированный слой под контентом. С `canUseRichMotion() === true`: WebGL-шейдер, где жидкость цвета `sections[next].bg` вливается в `sections[index].bg` с прогрессом `t` (между «Кофе» и «Рафами» — молоко в эспрессо: светлая жидкость с завихрениями). Иначе — CSS-градиент `mixColor` тех же цветов по `t`. Шейдер грузится отдельным чанком после `load`, DPR ≤ 1.5, пауза при скрытой вкладке.

- [ ] **Step 1: Сценарий `fallback-without-webgl` в `scripts/shots.mjs`** — контекст с `reducedMotion: "reduce"`: на странице нет `canvas`, вычисленный фон слоя `PourBackground` у каждого раздела не белый и не прозрачный. Run: `node scripts/shots.mjs fallback-without-webgl` → FAIL (слоя ещё нет).
- [ ] **Step 2: Реализовать** шейдер и запасной градиент.
- [ ] **Step 3: Run** `node scripts/shots.mjs fallback-without-webgl` → `ok`.
- [ ] **Step 4: Проверить глазами** — сценарий `pour`: 390×844, медленная прокрутка через границы «Кофе→Рафы» и «Вафли→Супы», кадры на t = 0, 0.5, 1 в `scripts/shots/pour-*.png`. Видно, как молоко вливается в эспрессо; текст при t = 0.5 читается.

### Task 8: 3D-стаканчик на первом экране

**Files:**
- Create: `src/motion/Cup3D.tsx`, `src/motion/CupFallback.tsx`, `src/components/Hero.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `canUseRichMotion` (Task 2), `HabitPicker` (Task 6).
- Produces: `<Hero />` — первый экран: заголовок, `CupFallback` (SVG-стаканчик, есть в статическом HTML), `HabitPicker`. После `load` и при `canUseRichMotion()` `CupFallback` подменяется на `Cup3D` (`next/dynamic`, `ssr: false`): картонный стаканчик с крышкой и своей надписью «Пенка», вращение по прокрутке первого экрана (GSAP ScrollTrigger `scrub`), в конце — наклон и «налив» в меню.

- [ ] **Step 1: Сценарий `hero-in-static-html`** — прочитать `out/index.html` после `npm run build`: есть «Что вы обычно пьёте?», есть `svg[data-cup="fallback"]`, нет `<canvas`. Run: `npm run build && node scripts/shots.mjs hero-in-static-html` → FAIL.
- [ ] **Step 2: Реализовать** `Hero`, `CupFallback`, `Cup3D`.
- [ ] **Step 3: Run** `npm run build && node scripts/shots.mjs hero-in-static-html` → `ok`.
- [ ] **Step 4: Проверить вес** — в выводе `next build` First Load JS страницы `/` без three.js (three в отдельном чанке). Записать цифру в README.
- [ ] **Step 5: Проверить глазами** — сценарий `cup`: 390×844 с GPU (флаги и подмена `OffscreenCanvas` как в `oblako-review/scripts/capture.mjs`), кадры прокрутки 0 / 50 / 100 % первого экрана.

### Task 9: Финальная проверка и табличка с QR

**Files:**
- Create: `print/table-card.html` (A6, QR на адрес меню, «Наведите камеру — меню и подбор напитка»), `README.md`
- Modify: `scripts/shots.mjs`

**Interfaces:**
- Consumes: всё выше.

- [ ] **Step 1: Сценарий `no-overflow-360`** — 360×780: прокрутить всю страницу и открыть шторки позиций с самыми длинными названиями; на каждом шаге `document.documentElement.scrollWidth <= innerWidth`, а цена у строки видна целиком (её правый край ≤ правого края строки). Run → `ok`.
- [ ] **Step 2: Скриншоты** — 390×844 (первый экран, по одному кадру на каждый раздел, открытая шторка позиции, подборка по привычке) и 1440×900 (рамка телефона). Посмотреть глазами каждый.
- [ ] **Step 3: Lighthouse mobile** на `npx serve out` — Performance ≥ 85, Accessibility ≥ 95; LCP < 2,5 с. Записать в README.
- [ ] **Step 4: Табличка** — `print/table-card.html` с QR (`qrcode`) на адрес из переменной `MENU_URL`, рендер в PNG/PDF через Edge headless (как `ava-agency-brand/v2/render.ps1`).
- [ ] **Step 5: README** — запуск, сборка, где данные меню, какие позиции придуманы, цифры веса и Lighthouse, что делать для «шик»-версии (из раздела «Потом» DESIGN.md).
