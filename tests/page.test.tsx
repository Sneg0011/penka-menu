import { fireEvent, render, screen, within } from "@testing-library/react";

import Page from "@/app/page";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { sectionStyle } from "@/components/MenuSection";
import { SectionCarousel } from "@/components/SectionCarousel";
import { menu } from "@/content/menu";
import { sections } from "@/content/sections";
import { contrast, mixColor, mutedInk } from "@/lib/theme";
import { progressFrom } from "@/motion/useSectionProgress";

// ───────── из брифа ─────────

test("футер дословно", () => { render(<Footer />); expect(screen.getByText("Концепт AVA AGENCY для кофейни „Пенка“. Не официальный сайт. Цены — по меню доставки на 4 октября 2026, в зале могут отличаться")).toBeInTheDocument(); });
test("в шапке чип концепта", () => { render(<Header theme={sections[0]} />); expect(screen.getByText("концепт AVA")).toBeInTheDocument(); });
// рендер всей страницы в jsdom тяжёлый: под нагрузкой на машине идёт 5–7 с — запас, чтобы тест не падал по таймеру
test("на странице все позиции", () => { render(<Page />); menu.forEach(i => expect(screen.getAllByText(i.name).length).toBeGreaterThan(0)); }, 20_000);

// ───────── страница ─────────

test("<ArtDefs /> на странице ровно один: после шапки и первого экрана, перед разделами", () => {
  const { container } = render(<Page />);
  const defs = container.querySelectorAll("[data-art-defs]");
  expect(defs).toHaveLength(1);
  const [svg] = defs;
  const header = container.querySelector("header")!;
  const firstSection = container.querySelector("section")!;
  expect(svg.parentElement!.firstElementChild).not.toBe(svg);
  expect(header.compareDocumentPosition(svg) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(svg.compareDocumentPosition(firstSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  // ни один предок не спрятан display:none — иначе ссылки на градиенты ломаются
  for (let el: Element | null = svg; el; el = el.parentElement) expect((el as HTMLElement).style?.display).not.toBe("none");
});

test("каждый раздел — <section id data-tone> с цветами из данных и заголовком", () => {
  const { container } = render(<Page />);
  const els = [...container.querySelectorAll("section")];
  expect(els.map((el) => el.id)).toEqual(sections.map((s) => s.id));
  els.forEach((el, k) => {
    const s = sections[k];
    expect(el.dataset.tone).toBe(s.tone);
    expect(el.style.getPropertyValue("--ink")).toBe(s.ink);
    expect(el.style.getPropertyValue("--accent")).toBe(s.accent);
    expect(within(el).getByRole("heading", { level: 2, name: s.title })).toBeInTheDocument();
  });
});

test("в заголовке страницы одно h1", () => {
  render(<Page />);
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
});

test("свой --muted раздела ≥ 4,5 : 1 на обоих цветах фона и на подложке чипа", () => {
  sections.forEach((s) => {
    const muted = sectionStyle(s)["--muted"];
    expect(muted).toBe(mutedInk(s));
    s.bg.forEach((bg) => {
      expect(contrast(muted, bg), `${s.id}: приглушённый на ${bg}`).toBeGreaterThanOrEqual(4.5);
      // pk-chip: подложка — 8 % цвета текста чипа (он и есть --muted) поверх фона
      expect(contrast(muted, mixColor(bg, muted, 0.08)), `${s.id}: чип на ${bg}`).toBeGreaterThanOrEqual(4.5);
    });
    // приглушённый действительно приглушён, а не равен основному цвету текста
    expect(muted).not.toBe(s.ink.toLowerCase());
  });
});

test("--muted, который выставлен на разделах страницы, — тот самый проверенный", () => {
  const { container } = render(<Page />);
  container.querySelectorAll("section").forEach((el, k) => expect(el.style.getPropertyValue("--muted")).toBe(mutedInk(sections[k])));
});

// ───────── шапка и карусель ─────────

test("шапка берёт цвета темы раздела", () => {
  const last = sections.at(-1)!;
  const { container } = render(<Header theme={last} />);
  const header = container.querySelector("header")!;
  expect(header.style.color).toBe(hexToRgb(last.ink));
  expect(header.dataset.tone).toBe(last.tone);
});

test("карусель: все разделы кнопками, текущий помечен aria-current", () => {
  render(<SectionCarousel active={3} onPick={() => {}} />);
  const nav = screen.getByRole("navigation", { name: "Разделы меню" });
  const buttons = within(nav).getAllByRole("button");
  expect(buttons.map((b) => b.textContent)).toEqual(sections.map((s) => s.title));
  expect(buttons.filter((b) => b.getAttribute("aria-current") === "true").map((b) => b.textContent)).toEqual([sections[3].title]);
});

test("карусель: тап по разделу отдаёт его номер", () => {
  const onPick = vi.fn();
  render(<SectionCarousel active={0} onPick={onPick} />);
  fireEvent.click(screen.getByRole("button", { name: "Десерты" }));
  expect(onPick).toHaveBeenCalledWith(sections.length - 1);
});

test("карусель с клавиатуры: Tab попадает на текущий, стрелки и Home/End выбирают соседние", () => {
  const onPick = vi.fn();
  render(<SectionCarousel active={2} onPick={onPick} />);
  const current = screen.getByRole("button", { name: sections[2].title });
  expect(current.tabIndex).toBe(0);
  screen.getAllByRole("button").filter((b) => b !== current).forEach((b) => expect(b.tabIndex).toBe(-1));
  fireEvent.keyDown(current, { key: "ArrowRight" });
  expect(onPick).toHaveBeenLastCalledWith(3);
  fireEvent.keyDown(current, { key: "ArrowLeft" });
  expect(onPick).toHaveBeenLastCalledWith(1);
  fireEvent.keyDown(current, { key: "End" });
  expect(onPick).toHaveBeenLastCalledWith(sections.length - 1);
  fireEvent.keyDown(current, { key: "Home" });
  expect(onPick).toHaveBeenLastCalledWith(0);
});

// ───────── прогресс прокрутки ─────────
// progressFrom(tops, line, viewport): tops — верх каждого раздела относительно верха окна прокрутки,
// line — линия чтения (низ липкой шапки), viewport — высота окна.

test("прогресс: до первого раздела — первый раздел, перехода нет", () => {
  expect(progressFrom([500, 1500, 2500], 100, 800)).toEqual({ index: 0, next: 1, t: 0 });
});

test("прогресс: раздел, верх которого прошёл линию чтения, — текущий; t растёт, пока следующий поднимается к линии", () => {
  // длинный раздел: зона перехода — от низа окна (800) до линии (100)
  expect(progressFrom([-2000, 800, 3000], 100, 800)).toEqual({ index: 0, next: 1, t: 0 });
  expect(progressFrom([-2000, 450, 3000], 100, 800)).toEqual({ index: 0, next: 1, t: 0.5 });
  expect(progressFrom([-2000, 101, 3000], 100, 800).t).toBeGreaterThan(0.99);
  expect(progressFrom([-2000, 100, 3000], 100, 800)).toMatchObject({ index: 1, next: 2 });
});

test("прогресс непрерывен на границе разделов и для коротких разделов (index + t не прыгает)", () => {
  const heights = [900, 300, 1400, 250, 2000];
  const line = 104;
  const viewport = 844;
  let previous = 0;
  for (let scroll = 0; scroll < 4000; scroll += 3) {
    let top = 200 - scroll;
    const tops = heights.map((h) => ((top += h), top - h));
    const p = progressFrom(tops, line, viewport);
    const position = p.index + p.t;
    expect(position, `scroll ${scroll}`).toBeGreaterThanOrEqual(previous - 1e-9);
    expect(position - previous, `scroll ${scroll}`).toBeLessThan(0.05);
    previous = position;
  }
});

test("прогресс: на последнем разделе next = index и t = 0 — без застрявшего полу-перелива", () => {
  expect(progressFrom([-5000, -3000, 100], 104, 844)).toEqual({ index: 2, next: 2, t: 0 });
  expect(progressFrom([-5000, -3000, -900], 104, 844)).toEqual({ index: 2, next: 2, t: 0 });
});

function hexToRgb(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
}
