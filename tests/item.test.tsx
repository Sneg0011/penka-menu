import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import { AllergenChips } from "@/components/AllergenChips";
import { ItemRow } from "@/components/ItemRow";
import { ItemSheet } from "@/components/ItemSheet";
import { tasteWords } from "@/lib/facts";
import { Sheet, SHEET_PALETTE } from "@/components/Sheet";
import { reviews } from "@/content/habits";
import { menu } from "@/content/menu";
import { sections } from "@/content/sections";
import type { Item } from "@/content/types";
import { pairsFor } from "@/lib/pairs";
import { contrast, mixColor } from "@/lib/theme";

const item = (id: string): Item => menu.find((i) => i.id === id)!;
const grabber = () => document.querySelector<HTMLElement>('[data-sheet="grabber"]')!;
const backdrop = () => document.querySelector<HTMLElement>('[data-sheet="backdrop"]')!;

// ───────── строка позиции ─────────

test("строка придуманной позиции показывает ≈ и «примерно»", () => { render(<ItemRow item={menu.find(i => !i.real)!} onOpen={() => {}} />); expect(screen.getByText(/^≈ \d+ ₽$/)).toBeInTheDocument(); expect(screen.getAllByText(/примерно/).length).toBeGreaterThan(0); });

test("реальная позиция с точной ценой: цена без «примерно», пометка про вкус и ккал — одна на строку", () => {
  render(<ItemRow item={item("mors-cranberry")} onOpen={() => {}} />);
  expect(screen.getByText("240 ₽")).toBeInTheDocument();
  expect(screen.getAllByText(/примерно/)).toHaveLength(1);
  expect(screen.getByText("400 мл")).toBeInTheDocument(); // объём реальной позиции — без «≈»
  expect(screen.queryByText(/≈/)).toBeNull();
});

test("придуманная позиция: «примерно» и у цены, и у значков; объём с «≈»", () => {
  render(<ItemRow item={item("latte")} onOpen={() => {}} />);
  expect(screen.getAllByText(/примерно/)).toHaveLength(2);
  expect(screen.getByText("≈ 300 мл")).toBeInTheDocument();
});

test("капучино: «от 200 ₽» без «примерно» у цены, объём с «≈»", () => {
  render(<ItemRow item={item("cappuccino")} onOpen={() => {}} />);
  expect(screen.getByText("от 200 ₽")).toBeInTheDocument();
  expect(screen.getByText("≈ 250 мл")).toBeInTheDocument();
  expect(screen.getAllByText(/примерно/)).toHaveLength(1);
});

test("раф «Фисташковый»: цена угадана — «≈» и «примерно»; объём с «≈»", () => {
  render(<ItemRow item={item("raf-pistachio")} onOpen={() => {}} />);
  expect(screen.getByText(/^≈ \d+ ₽$/)).toBeInTheDocument();
  expect(screen.getByText("≈ 250 мл")).toBeInTheDocument();
  expect(screen.getAllByText(/примерно/)).toHaveLength(2);
});

test("вкус в строке — словами, без значков и точек; точки остаются в шторке", () => {
  render(<ItemRow item={item("latte")} onOpen={() => {}} />); // сладость 2, горечь 1, кислинка 0, крепость 1
  expect(screen.getByText("Сладковатый, мягкий")).toBeInTheDocument();
  expect(screen.queryByLabelText(/сладость|крепость/)).toBeNull();
  expect(screen.getByText("170 ккал")).toBeInTheDocument();
});

test("вкус словами: крепость 3 первой, затем выраженные шкалы; без шкал — ничего", () => {
  expect(tasteWords(item("espresso"))).toBe("Крепкий, горький");
  expect(tasteWords(item("flat-white"))).toBe("Крепкий, с горчинкой");
  expect(tasteWords(item("raf-pistachio"))).toBe("Сладкий, мягкий");
  expect(tasteWords(item("mors-cranberry"))).toBe("С яркой кислинкой");
  expect(tasteWords(item("tea-green"))).toBe("Мягкий");
  expect(tasteWords(menu.find((i) => !i.taste)!)).toBeNull();
});

test("аллергенов в строке нет (они в шторке), «можно на растительном» только у тех, у кого plantMilk", () => {
  const { unmount } = render(<ItemRow item={item("raf-pistachio")} onOpen={() => {}} />);
  expect(screen.queryByText("лактоза")).toBeNull();
  expect(screen.queryByText("орехи")).toBeNull();
  expect(screen.queryByText("можно на растительном")).toBeNull();
  unmount();
  render(<ItemRow item={item("latte")} onOpen={() => {}} />);
  expect(screen.getByText("можно на растительном")).toBeInTheDocument();
});

test("все шесть аллергенов подписаны по-русски", () => {
  render(<AllergenChips allergens={["lactose", "gluten", "nuts", "eggs", "fish", "seafood"]} />);
  ["лактоза", "глютен", "орехи", "яйца", "рыба", "морепродукты"].forEach((label) => expect(screen.getByText(label)).toBeInTheDocument());
});

test("без аллергенов и растительного молока чипов нет", () => {
  const { container } = render(<AllergenChips allergens={[]} />);
  expect(container).toBeEmptyDOMElement();
});

test("строка — одна кнопка; имя — название и цена, тап отдаёт id", async () => {
  const onOpen = vi.fn();
  render(<ItemRow item={item("flat-white")} onOpen={onOpen} />);
  const buttons = screen.getAllByRole("button");
  expect(buttons).toHaveLength(1);
  expect(buttons[0]).toHaveAccessibleName(/^Флэт уайт\s+≈ 270 ₽$/);
  await userEvent.click(buttons[0]);
  expect(onOpen).toHaveBeenCalledWith("flat-white");
});

// Что названия не обрезаются и цена остаётся на виду, jsdom проверить не может (нет вёрстки):
// это делает `node scripts/card-shots.mjs` в Chrome на 360 px по всем позициям.
test("длинное название выводится целиком — и в тексте, и в доступном имени кнопки", () => {
  const long = item("penne-chicken-mushrooms");
  render(<ItemRow item={long} onOpen={() => {}} />);
  expect(screen.getByText(long.name)).toBeInTheDocument();
  expect(screen.getByRole("button")).toHaveAccessibleName(new RegExp(long.name));
});

test("«примерно» у цены читается скринридером: входит в описание кнопки первым", () => {
  const { unmount } = render(<ItemRow item={item("latte")} onOpen={() => {}} />);
  expect(screen.getByRole("button")).toHaveAccessibleDescription(/^примерно/);
  unmount();
  render(<ItemRow item={item("mors-cranberry")} onOpen={() => {}} />); // цена точная — пометки у цены нет
  const description = screen.getByRole("button").getAttribute("aria-describedby")!;
  expect(description.split(" ")).toHaveLength(1);
  expect(screen.getByRole("button")).not.toHaveAccessibleDescription(/^примерно/);
});

// ───────── контраст приглушённого текста ─────────
// Приглушённый цвет в globals.css — color-mix(currentColor N%, transparent); на экране это смесь текста и фона.
// Берём доли прямо из файла, чтобы тест проверял то, что едет на экран.

const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
const mixPercent = (utility: string, property: "color" | "background-color") => {
  // тело `@utility pk-…  { … }`, затем строка нужного свойства внутри него
  const body = new RegExp(String.raw`@utility ${utility} \{([^}]*)\}`).exec(css)?.[1] ?? "";
  const line = body.split(";").find((l) => l.trim().startsWith(`${property}:`)) ?? "";
  const match = /color-mix\(in srgb, currentColor (\d+)%, transparent\)/.exec(line);
  if (!match) throw new Error(`В globals.css у ${utility} нет ${property}: color-mix(currentColor N%, transparent)`);
  return Number(match[1]) / 100;
};
const MIN_TEXT_CONTRAST = 4.5;

test("приглушённый текст (pk-muted) ≥ 4,5 : 1 на обоих цветах фона каждого из 10 разделов", () => {
  const share = mixPercent("pk-muted", "color");
  expect(sections).toHaveLength(10);
  sections.forEach((s) =>
    s.bg.forEach((bg) => {
      const muted = mixColor(bg, s.ink, share);
      expect(contrast(muted, bg), `${s.id} на ${bg}`).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    }),
  );
});

test("текст чипа (pk-chip) ≥ 4,5 : 1 на собственной подложке в каждом из 10 разделов", () => {
  const text = mixPercent("pk-chip", "color");
  const tint = mixPercent("pk-chip", "background-color"); // подложка — оттенок цвета самого текста
  sections.forEach((s) =>
    s.bg.forEach((bg) => {
      const color = mixColor(bg, s.ink, text);
      const chip = mixColor(bg, color, tint);
      expect(contrast(color, chip), `${s.id} на ${bg}`).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    }),
  );
});

test("палитра шторки: основной, приглушённый (и на чипе) текст и акцент ≥ 4,5 : 1", () => {
  const { bg, ink, muted, accent } = SHEET_PALETTE;
  expect(contrast(ink, bg)).toBeGreaterThanOrEqual(7);
  expect(contrast(muted, bg)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  expect(contrast(muted, mixColor(bg, muted, mixPercent("pk-chip", "background-color")))).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  expect(contrast(accent, bg)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
});

// ───────── шторка ─────────

test("sheet-closes-and-unlocks-scroll", async () => {
  const onClose = vi.fn(); const { rerender } = render(<Sheet open onClose={onClose}>x</Sheet>);
  expect(document.body.style.overflow).toBe("hidden");
  await userEvent.keyboard("{Escape}"); expect(onClose).toHaveBeenCalled();
  rerender(<Sheet open={false} onClose={onClose}>x</Sheet>); expect(document.body.style.overflow).toBe("");
});

test("закрытая шторка ничего не рисует и не блокирует прокрутку", () => {
  render(<Sheet open={false} onClose={() => {}}>секрет</Sheet>);
  expect(screen.queryByText("секрет")).toBeNull();
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.body.style.overflow).toBe("");
});

test("диалог: role, aria-modal и имя по заголовку внутри", () => {
  render(<Sheet open onClose={() => {}} labelledBy="t"><h2 id="t">Заголовок шторки</h2></Sheet>);
  const dialog = screen.getByRole("dialog", { name: "Заголовок шторки" });
  expect(dialog).toHaveAttribute("aria-modal", "true");
});

test("диалог без заголовка всё равно имеет имя", () => {
  render(<Sheet open onClose={() => {}}>x</Sheet>);
  expect(screen.getByRole("dialog")).toHaveAccessibleName();
});

test("при закрытии возвращается то значение overflow, что было до открытия", () => {
  document.body.style.overflow = "scroll";
  const { rerender } = render(<Sheet open onClose={() => {}}>x</Sheet>);
  expect(document.body.style.overflow).toBe("hidden");
  rerender(<Sheet open={false} onClose={() => {}}>x</Sheet>);
  expect(document.body.style.overflow).toBe("scroll");
  document.body.style.overflow = "";
});

test("две шторки подряд: прокрутка разблокируется, в каком бы порядке их ни закрыли", () => {
  document.body.style.overflow = "auto";
  const Two = ({ a, b }: { a: boolean; b: boolean }) => (<><Sheet open={a} onClose={() => {}}>a</Sheet><Sheet open={b} onClose={() => {}}>b</Sheet></>);
  const { rerender } = render(<Two a b />);
  expect(document.body.style.overflow).toBe("hidden");
  rerender(<Two a={false} b />); // первую закрыли раньше второй
  expect(document.body.style.overflow).toBe("hidden");
  rerender(<Two a={false} b={false} />);
  expect(document.body.style.overflow).toBe("auto");
  document.body.style.overflow = "";
});

test("Escape закрывает только верхнюю из двух шторок", async () => {
  const lower = vi.fn(); const upper = vi.fn();
  render(<><Sheet open onClose={lower}>нижняя</Sheet><Sheet open onClose={upper}>верхняя</Sheet></>);
  await userEvent.keyboard("{Escape}");
  expect(upper).toHaveBeenCalledTimes(1);
  expect(lower).not.toHaveBeenCalled();
});

test("тап по подложке закрывает, тап по самой шторке — нет", async () => {
  const onClose = vi.fn();
  render(<Sheet open onClose={onClose}><p>внутри</p></Sheet>);
  await userEvent.click(screen.getByText("внутри"));
  expect(onClose).not.toHaveBeenCalled();
  await userEvent.click(backdrop());
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("кнопка «Закрыть» закрывает", async () => {
  const onClose = vi.fn();
  render(<Sheet open onClose={onClose}>x</Sheet>);
  await userEvent.click(screen.getByRole("button", { name: "Закрыть" }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("свайп вниз на 80 px и больше закрывает", () => {
  const onClose = vi.fn();
  render(<Sheet open onClose={onClose}>x</Sheet>);
  fireEvent.pointerDown(grabber(), { pointerId: 1, clientY: 200 });
  fireEvent.pointerMove(grabber(), { pointerId: 1, clientY: 260 });
  fireEvent.pointerUp(grabber(), { pointerId: 1, clientY: 290 });
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("короткий свайп и свайп вверх не закрывают, шторка возвращается на место", () => {
  const onClose = vi.fn();
  render(<Sheet open onClose={onClose}>x</Sheet>);
  const dialog = screen.getByRole("dialog");
  fireEvent.pointerDown(grabber(), { pointerId: 1, clientY: 200 });
  fireEvent.pointerMove(grabber(), { pointerId: 1, clientY: 240 });
  expect(dialog.style.transform).toBe("translateY(40px)"); // шторка тянется за пальцем
  fireEvent.pointerUp(grabber(), { pointerId: 1, clientY: 270 }); // 70 px — меньше порога
  expect(onClose).not.toHaveBeenCalled();
  expect(dialog.style.transform).toBe("");
  fireEvent.pointerDown(grabber(), { pointerId: 2, clientY: 200 });
  fireEvent.pointerUp(grabber(), { pointerId: 2, clientY: 100 });
  expect(onClose).not.toHaveBeenCalled();
});

test("отменённый жест (pointercancel) не закрывает", () => {
  const onClose = vi.fn();
  render(<Sheet open onClose={onClose}>x</Sheet>);
  fireEvent.pointerDown(grabber(), { pointerId: 1, clientY: 200 });
  fireEvent.pointerMove(grabber(), { pointerId: 1, clientY: 320 });
  fireEvent.pointerCancel(grabber(), { pointerId: 1 });
  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog").style.transform).toBe("");
});

test("фокус уходит внутрь шторки при открытии и возвращается на прежний элемент при закрытии", async () => {
  function Host() {
    const [open, setOpen] = useState(false);
    return (<><button onClick={() => setOpen(true)}>Открыть</button><Sheet open={open} onClose={() => setOpen(false)}>текст</Sheet></>);
  }
  render(<Host />);
  const opener = screen.getByRole("button", { name: "Открыть" });
  opener.focus();
  await userEvent.click(opener);
  expect(screen.getByRole("dialog")).toContainElement(document.activeElement as HTMLElement);
  await userEvent.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(opener).toHaveFocus();
});

test("Tab не уходит из шторки: с последнего элемента — на первый, Shift+Tab с первого — на последний", async () => {
  render(<Sheet open onClose={() => {}}><button>Один</button><button>Два</button></Sheet>);
  const close = screen.getByRole("button", { name: "Закрыть" });
  const two = screen.getByRole("button", { name: "Два" });
  two.focus();
  await userEvent.tab();
  expect(close).toHaveFocus();
  await userEvent.tab({ shift: true });
  expect(two).toHaveFocus();
});

// ───────── шторка позиции ─────────

test("тап по паре открывает ту позицию", async () => {
  const onOpenItem = vi.fn(); render(<ItemSheet itemId="latte" onClose={() => {}} onOpenItem={onOpenItem} />);
  const first = pairsFor("latte")[0]; await userEvent.click(screen.getByRole("button", { name: new RegExp(first.item.name) }));
  expect(onOpenItem).toHaveBeenCalledWith(first.item.id);
});

test("itemId = null — ничего не рисуется", () => {
  const { baseElement } = render(<ItemSheet itemId={null} onClose={() => {}} onOpenItem={() => {}} />);
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(baseElement.querySelector("svg")).toBeNull();
  expect(document.body.style.overflow).toBe("");
});

test("неизвестный id тоже ничего не рисует", () => {
  render(<ItemSheet itemId="no-such-item" onClose={() => {}} onOpenItem={() => {}} />);
  expect(screen.queryByRole("dialog")).toBeNull();
});

test("шторка позиции: диалог по названию, цена, полный текст, крупный рисунок 220 px", () => {
  const latte = item("latte");
  render(<ItemSheet itemId="latte" onClose={() => {}} onOpenItem={() => {}} />);
  const dialog = screen.getByRole("dialog", { name: latte.name });
  expect(within(dialog).getByText(latte.text)).toBeInTheDocument();
  expect(within(dialog).getByText("≈ 260 ₽")).toBeInTheDocument();
  expect(dialog.querySelector("svg[width='220']")).not.toBeNull();
});

test("блок «вкус, калории и аллергены» подписан «примерно», шкалы с подписями", () => {
  render(<ItemSheet itemId="latte" onClose={() => {}} onOpenItem={() => {}} />);
  const facts = screen.getByRole("region", { name: "Вкус, калории и аллергены — примерно" });
  ["Сладость", "Горечь", "Кислинка", "Крепость", "Калории"].forEach((label) => expect(within(facts).getByText(label)).toBeInTheDocument());
  expect(within(facts).getByLabelText("сладость 2 из 3")).toBeInTheDocument();
  expect(within(facts).getByText("170 ккал")).toBeInTheDocument();
  expect(within(facts).getByText("лактоза")).toBeInTheDocument();
  expect(within(facts).getByText("можно на растительном")).toBeInTheDocument();
});

test("объём напитка и вес блюда подписаны по-разному, придуманное — с «≈»", () => {
  const { unmount } = render(<ItemSheet itemId="latte" onClose={() => {}} onOpenItem={() => {}} />);
  expect(screen.getByText("Объём ≈ 300 мл")).toBeInTheDocument();
  unmount();
  render(<ItemSheet itemId="shakshuka" onClose={() => {}} onOpenItem={() => {}} />);
  expect(screen.getByText("Вес 300 г")).toBeInTheDocument();
});

test("отзывы сгруппированы по привычке и помечены «пример»", () => {
  render(<ItemSheet itemId="cappuccino" onClose={() => {}} onOpenItem={() => {}} />);
  const region = screen.getByRole("region", { name: /Отзывы/ });
  expect(within(region).getByText("пример")).toBeInTheDocument();
  expect(within(region).getByText("Обычно пьют растворимый с молоком:")).toBeInTheDocument();
  expect(within(region).getByText("Обычно пьют капучино из сетевых кофеен:")).toBeInTheDocument();
  reviews.filter((r) => r.item === "cappuccino").forEach((r) => expect(within(region).getByText(r.nuance)).toBeInTheDocument());
});

test("у привычки «не пью кофе» заголовок отзывов грамматически целый", () => {
  render(<ItemSheet itemId="fresh-orange" onClose={() => {}} onOpenItem={() => {}} />);
  const region = screen.getByRole("region", { name: /Отзывы/ });
  expect(within(region).queryByText(/пьют вообще не пью/)).toBeNull();
  expect(within(region).getByText("Те, кто вообще не пьёт кофе:")).toBeInTheDocument();
});

test("если у позиции нет отзывов, блока отзывов нет", () => {
  const withoutReviews = menu.find((i) => !reviews.some((r) => r.item === i.id))!;
  render(<ItemSheet itemId={withoutReviews.id} onClose={() => {}} onOpenItem={() => {}} />);
  expect(screen.queryByRole("region", { name: /Отзывы/ })).toBeNull();
});

test("«Часто берут вместе» помечено «пример»; пары — кнопки с названием и ценой", () => {
  render(<ItemSheet itemId="latte" onClose={() => {}} onOpenItem={() => {}} />);
  const region = screen.getByRole("region", { name: /Часто берут вместе/ });
  expect(within(region).getByText("пример")).toBeInTheDocument();
  const picks = pairsFor("latte");
  const buttons = within(region).getAllByRole("button");
  expect(buttons).toHaveLength(picks.length);
  picks.forEach((p, i) => expect(buttons[i]).toHaveAccessibleName(new RegExp(p.item.name)));
});

test("у позиции без пар блока «берут вместе» нет", () => {
  const lonely = menu.find((i) => pairsFor(i.id).length === 0)!;
  render(<ItemSheet itemId={lonely.id} onClose={() => {}} onOpenItem={() => {}} />);
  expect(screen.queryByRole("region", { name: /Часто берут вместе/ })).toBeNull();
});

test("шторка позиции закрывается по Escape и разблокирует прокрутку", async () => {
  const onClose = vi.fn();
  const { rerender } = render(<ItemSheet itemId="latte" onClose={onClose} onOpenItem={() => {}} />);
  expect(document.body.style.overflow).toBe("hidden");
  await userEvent.keyboard("{Escape}");
  expect(onClose).toHaveBeenCalledTimes(1);
  rerender(<ItemSheet itemId={null} onClose={onClose} onOpenItem={() => {}} />);
  expect(document.body.style.overflow).toBe("");
});

test("переход по паре в той же шторке: показывается новая позиция, фокус остаётся внутри", async () => {
  function Host() {
    const [id, setId] = useState<string | null>("latte");
    return <ItemSheet itemId={id} onClose={() => setId(null)} onOpenItem={setId} />;
  }
  render(<Host />);
  const first = pairsFor("latte")[0];
  await userEvent.click(screen.getByRole("button", { name: new RegExp(first.item.name) }));
  const dialog = screen.getByRole("dialog", { name: first.item.name });
  expect(dialog).toContainElement(document.activeElement as HTMLElement);
  expect(within(dialog).getByText(first.item.text)).toBeInTheDocument();
});
