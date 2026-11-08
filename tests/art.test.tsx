import { StrictMode } from "react";
import { render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";

import { ArtDefs } from "@/art/ArtDefs";
import { DrinkArt } from "@/art/DrinkArt";
import { FoodArt } from "@/art/FoodArt";
import { INGREDIENTS } from "@/art/ingredients";
import { ItemArt } from "@/art/ItemArt";
import { menu } from "@/content/menu";

const item = (id: string) => menu.find((i) => i.id === id)!;
const foods = menu.flatMap((i) => (i.art.type === "food" ? [{ id: i.id, item: i, ingredients: i.art.ingredients }] : []));
const drinks = menu.flatMap((i) => (i.art.type === "drink" ? [{ id: i.id, item: i, layers: i.art.layers }] : []));
const markup = (i: (typeof menu)[number]) => renderToStaticMarkup(<ItemArt item={i} size={96} />);

/** Байтовый бюджет разметки одного рисунка (без общих <ArtDefs />, они один раз на страницу). */
const MAX_ITEM_BYTES = 2600;
const MAX_AVG_BYTES = 1100;

test("в латте молока больше, чем в капучино", () => {
  const h = (id: string) => Number(render(<ItemArt item={menu.find(i => i.id === id)!} size={120} />).container.querySelector('[data-layer="milk"]')!.getAttribute("height"));
  expect(h("latte")).toBeGreaterThan(h("cappuccino"));
});
test("каждая позиция рисуется без ошибок", () => menu.forEach(i => expect(() => render(<ItemArt item={i} size={96} />)).not.toThrow()));
test("неизвестный ингредиент не ломает рисунок", () => {
  const { container } = render(<FoodArt art={{ type: "food", dish: "plate", ingredients: ["xyz"] }} size={96} />);
  expect(container.querySelector("svg")).not.toBeNull();
  expect(container.querySelector('g[data-ingredient="xyz"]')).not.toBeNull();
});

test("высота слоя пропорциональна part внутри рисунка (капучино: молоко / пена ≈ 2 / 1,5)", () => {
  const { container } = render(<ItemArt item={item("cappuccino")} size={120} />);
  const h = (kind: string) => Number(container.querySelector(`[data-layer="${kind}"]`)!.getAttribute("height"));
  expect(h("milk") / h("foam")).toBeCloseTo(2 / 1.5, 1);
  expect(h("milk") / h("espresso")).toBeCloseTo(2 / 1, 1);
});

test("у каждого напитка доля высоты слоя = доля part (±0,02)", () =>
  drinks.forEach(({ id, item: i, layers }) => {
    const { container, unmount } = render(<ItemArt item={i} size={96} />);
    const rects = [...container.querySelectorAll("rect[data-layer]")];
    expect(rects.map((r) => r.getAttribute("data-layer")), id).toEqual(layers.map((l) => l.kind));
    const heights = rects.map((r) => Number(r.getAttribute("height")));
    const sumH = heights.reduce((s, x) => s + x, 0);
    const sumP = layers.reduce((s, l) => s + l.part, 0);
    layers.forEach((l, k) => expect(Math.abs(heights[k] / sumH - l.part / sumP), `${id}: ${l.kind}`).toBeLessThan(0.02));
    unmount();
  }));

test("каждый ингредиент из меню нарисован своим рисунком, а не крошкой", () => {
  const used = new Set(foods.flatMap((f) => f.ingredients));
  expect(used.size).toBeGreaterThan(0);
  used.forEach((name) => expect(Object.keys(INGREDIENTS), name).toContain(name));
});

test("каждый ингредиент позиции есть в её рисунке", () =>
  foods.forEach(({ id, item: i, ingredients }) => {
    const { container, unmount } = render(<ItemArt item={i} size={96} />);
    ingredients.forEach((name) => expect(container.querySelector(`[data-ingredient="${name}"]`), `${id}: ${name}`).not.toBeNull());
    unmount();
  }));

test("один и тот же рисунок — одна и та же разметка", () => menu.forEach((i) => expect(markup(i), i.id).toBe(markup(i))));

test("у двух рисунков на странице свои id", () => {
  const { container } = render(
    <>
      <ItemArt item={item("latte")} size={96} />
      <ItemArt item={item("latte")} size={96} />
    </>,
  );
  const [a, b] = [...container.querySelectorAll("svg")].map((svg) => [...svg.querySelectorAll("[id]")].map((el) => el.id));
  expect(a.length).toBeGreaterThan(0);
  expect(a.filter((x) => b.includes(x))).toEqual([]);
});

test("каждая ссылка рисунка ведёт в <ArtDefs /> или в свой svg", () => {
  render(<ArtDefs />);
  const extra = [
    <DrinkArt key="paper" art={{ type: "drink", vessel: "paper", layers: [{ kind: "espresso", part: 1 }, { kind: "milk", part: 2 }] }} size={96} />,
    <FoodArt key="xyz" art={{ type: "food", dish: "bowl", ingredients: ["xyz"] }} size={96} />,
  ];
  [...menu.map((i) => <ItemArt key={i.id} item={i} size={96} />), ...extra].forEach((el) => {
    const { container, unmount } = render(el);
    const refs = [...container.querySelectorAll("*")].flatMap((node) =>
      [...node.attributes].flatMap((attr) => [
        ...[...attr.value.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]),
        ...(attr.name === "href" && attr.value.startsWith("#") ? [attr.value.slice(1)] : []),
      ]),
    );
    expect(refs.length).toBeGreaterThan(0);
    refs.forEach((ref) => expect(document.getElementById(ref), `${String(el.key)} → #${ref}`).not.toBeNull());
    unmount();
  });
});

test("<ArtDefs /> — один невидимый svg без display:none", () => {
  const { container } = render(<ArtDefs />);
  const svg = container.querySelector("svg[data-art-defs]") as SVGSVGElement;
  expect(svg).not.toBeNull();
  expect(svg.getAttribute("aria-hidden")).toBe("true");
  expect(svg.style.position).toBe("absolute");
  expect(svg.style.display).not.toBe("none");
  expect(svg.querySelector("#pk-grain")).not.toBeNull();
});

test("разметка рисунка укладывается в байтовый бюджет", () => {
  const sizes = menu.map((i) => [i.id, markup(i).length] as const);
  sizes.forEach(([id, bytes]) => expect(bytes, id).toBeLessThanOrEqual(MAX_ITEM_BYTES));
  expect(sizes.reduce((s, [, bytes]) => s + bytes, 0) / sizes.length).toBeLessThanOrEqual(MAX_AVG_BYTES);
});

// ── Чистота рисунков: «случай» берётся из генератора, засеянного внутри чистой функции ──
// Если генератор создаётся в одном компоненте, а расходуется в другом (передан пропом), повторный рендер
// того же компонента (StrictMode, гидратация в `next dev`) тянет из него следующие числа — и разметка
// клиента расходится с серверной. Здесь повторный рендер — StrictMode: он вызывает каждый компонент дважды.

/** Ids из useId при каждом клиентском рендере новые — заменяем их порядковыми, общие `pk-…` не трогаем. */
function normalizeIds(html: string) {
  const ids = [...new Set([...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]).filter((id) => !id.startsWith("pk-")))];
  return ids
    .sort((a, b) => b.length - a.length)
    .reduce((out, id, k) => out.split(id).join(`@id${k}`), html);
}

function clientHtml(node: React.ReactNode, strict: boolean) {
  const { container, unmount } = render(strict ? <StrictMode>{node}</StrictMode> : node);
  const html = normalizeIds(container.innerHTML);
  unmount();
  return html;
}

test("рисунки чистые: двойной рендер (StrictMode, как при гидратации в dev) даёт ту же разметку, что и одиночный", () => {
  expect(clientHtml(<ArtDefs />, true)).toBe(clientHtml(<ArtDefs />, false));
  menu.forEach((i) => expect(clientHtml(<ItemArt item={i} size={96} />, true), i.id).toBe(clientHtml(<ItemArt item={i} size={96} />, false)));
});

test("рисунки чистые: в прямом и обратном порядке у каждого рисунка одна и та же разметка", () => {
  const perDrawing = (items: typeof menu) => {
    const { container, unmount } = render(
      <StrictMode>
        {items.map((i) => (
          <div key={i.id} data-k={i.id}>
            <ItemArt item={i} size={96} />
          </div>
        ))}
        <ArtDefs />
      </StrictMode>,
    );
    const out = Object.fromEntries([...container.querySelectorAll<HTMLElement>("[data-k]")].map((el) => [el.dataset.k!, normalizeIds(el.innerHTML)]));
    const defs = container.querySelector("[data-art-defs]")!.outerHTML;
    unmount();
    return { out, defs };
  };
  const forward = perDrawing(menu);
  const backward = perDrawing([...menu].reverse());
  expect(backward.defs).toBe(forward.defs);
  menu.forEach((i) => expect(backward.out[i.id], i.id).toBe(forward.out[i.id]));
});
