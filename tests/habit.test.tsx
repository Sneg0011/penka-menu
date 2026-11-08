import { renderToString } from "react-dom/server";

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Page from "@/app/page";
import { HabitPicker } from "@/components/HabitPicker";
import { HabitSheet } from "@/components/HabitSheet";
import { habits } from "@/content/habits";
import { habitHeading } from "@/lib/facts";
import { drinksForHabit } from "@/lib/recommend";

// ───────── из брифа ─────────

test("7 кнопок привычек", () => { render(<HabitPicker onPick={() => {}} />); expect(screen.getByText("Что вы обычно пьёте?")).toBeInTheDocument(); expect(screen.getAllByRole("button")).toHaveLength(7); });
test("подборка в порядке drinksForHabit и с пометкой", () => {
  render(<HabitSheet habitId="instant-milk" onClose={() => {}} onOpenItem={() => {}} />);
  const names = drinksForHabit("instant-milk").map(r => r.item.name);
  expect(screen.getAllByTestId("habit-item").map(e => e.dataset.name)).toEqual(names);
  expect(screen.getByText(/отзывы — пример/)).toBeInTheDocument();
});

// ───────── вход ─────────

test("кнопки — привычки по порядку, с подписями из данных; тап отдаёт id", async () => {
  const onPick = vi.fn();
  render(<HabitPicker onPick={onPick} />);
  expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(habits.map((h) => h.label));
  await userEvent.click(screen.getByRole("button", { name: "Чай" }));
  expect(onPick).toHaveBeenCalledWith("tea");
  expect(onPick).toHaveBeenCalledTimes(1);
});

test("вход — группа с именем по заголовку, не <section>: разделы меню считаются по <section>", () => {
  const { container } = render(<HabitPicker onPick={() => {}} />);
  expect(screen.getByRole("group", { name: "Что вы обычно пьёте?" })).toBeInTheDocument();
  expect(container.querySelector("section")).toBeNull();
});

test("с клавиатуры: Tab доходит до кнопки, Enter и пробел выбирают привычку", async () => {
  const onPick = vi.fn();
  render(<HabitPicker onPick={onPick} />);
  await userEvent.tab();
  expect(screen.getByRole("button", { name: habits[0].label })).toHaveFocus();
  await userEvent.keyboard("{Enter}");
  expect(onPick).toHaveBeenLastCalledWith(habits[0].id);
  await userEvent.tab();
  await userEvent.keyboard(" ");
  expect(onPick).toHaveBeenLastCalledWith(habits[1].id);
});

// ───────── заголовок подборки ─────────

const TITLES: Record<string, string> = {
  "instant-milk": "Людям, которые обычно пьют растворимый с молоком, понравилось",
  "chain-cappuccino": "Людям, которые обычно пьют капучино из сетевых кофеен, понравилось",
  black: "Людям, которые обычно пьют чёрный без сахара, понравилось",
  tea: "Людям, которые обычно пьют чай, понравилось",
  "sweet-syrup": "Людям, которые обычно пьют сладкое с сиропом, понравилось",
  energy: "Людям, которые обычно пьют энергетики, понравилось",
  "no-coffee": "Тем, кто не пьёт кофе, понравилось",
};

test("заголовок подборки читается по-русски у всех семи привычек", () => {
  expect(habits.map((h) => h.id).sort()).toEqual(Object.keys(TITLES).sort());
  habits.forEach((habit) => expect(habitHeading(habit), habit.id).toBe(TITLES[habit.id]));
});

test("шторка: заголовок — имя диалога, у каждой привычки свой", () => {
  habits.forEach((habit) => {
    const { unmount } = render(<HabitSheet habitId={habit.id} onClose={() => {}} onOpenItem={() => {}} />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(TITLES[habit.id]);
    expect(screen.getByRole("dialog", { name: TITLES[habit.id] })).toBeInTheDocument();
    unmount();
  });
});

// ───────── подборка ─────────

test("без привычки шторка ничего не рисует и не блокирует прокрутку", () => {
  render(<HabitSheet habitId={null} onClose={() => {}} onOpenItem={() => {}} />);
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.body.style.overflow).toBe("");
});

test("у каждой привычки подборка не пуста; после строки — её нюансы словами гостя, все до единого", () => {
  habits.forEach((habit) => {
    const picks = drinksForHabit(habit.id);
    expect(picks.length, habit.id).toBeGreaterThan(0);
    const { unmount } = render(<HabitSheet habitId={habit.id} onClose={() => {}} onOpenItem={() => {}} />);
    const rows = screen.getAllByTestId("habit-item");
    expect(rows, habit.id).toHaveLength(picks.length);
    rows.forEach((row, k) => {
      expect(within(row).getByRole("button", { name: new RegExp(picks[k].item.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }), habit.id).toBeInTheDocument();
      picks[k].nuances.forEach((nuance) => expect(within(row).getByText(nuance)).toBeInTheDocument());
    });
    unmount();
  });
});

test("тап по строке подборки отдаёт id позиции", async () => {
  const onOpenItem = vi.fn();
  render(<HabitSheet habitId="black" onClose={() => {}} onOpenItem={onOpenItem} />);
  const [first] = drinksForHabit("black");
  await userEvent.click(within(screen.getAllByTestId("habit-item")[0]).getByRole("button"));
  expect(onOpenItem).toHaveBeenCalledExactlyOnceWith(first.item.id);
});

test("пометка «отзывы — пример» одна, а сам диалог закрывается по кнопке", async () => {
  const onClose = vi.fn();
  render(<HabitSheet habitId="tea" onClose={onClose} onOpenItem={() => {}} />);
  expect(screen.getAllByText(/отзывы — пример/)).toHaveLength(1);
  await userEvent.click(screen.getByRole("button", { name: "Закрыть" }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

// ───────── на странице ─────────

test("вход на первом экране: после заголовка страницы, перед <ArtDefs /> и разделами", () => {
  const { container } = render(<Page />);
  const h1 = screen.getByRole("heading", { level: 1 });
  const entry = screen.getByRole("group", { name: "Что вы обычно пьёте?" });
  const defs = container.querySelector("[data-art-defs]")!;
  const firstSection = container.querySelector("section")!;
  expect(h1.compareDocumentPosition(entry) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(entry.compareDocumentPosition(defs) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(entry.compareDocumentPosition(firstSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(within(entry).getAllByRole("button")).toHaveLength(habits.length);
});

test("вход есть в статической разметке: до гидратации", () => {
  const html = renderToString(<Page />);
  expect(html).toContain("Что вы обычно пьёте?");
  habits.forEach((h) => expect(html).toContain(h.label));
  expect(html).not.toContain('role="dialog"');
});

test("привычка → подборка шторкой; тап по строке → карточка поверх; Escape закрывает по одной, прокрутка возвращается", async () => {
  render(<Page />);
  expect(document.body.style.overflow).toBe("");
  await userEvent.click(screen.getByRole("button", { name: "Растворимый с молоком" }));

  const habitSheet = screen.getByRole("dialog", { name: TITLES["instant-milk"] });
  expect(screen.getAllByRole("dialog")).toHaveLength(1);
  expect(document.body.style.overflow).toBe("hidden");

  const [top] = drinksForHabit("instant-milk");
  const rowButton = within(screen.getAllByTestId("habit-item")[0]).getByRole("button");
  await userEvent.click(rowButton);
  const dialogs = screen.getAllByRole("dialog");
  expect(dialogs).toHaveLength(2);
  expect(dialogs[0]).toBe(habitSheet); // подборка осталась внизу
  expect(dialogs[1]).toHaveAccessibleName(top.item.name); // карточка — поверх

  await userEvent.keyboard("{Escape}");
  expect(screen.getAllByRole("dialog")).toEqual([habitSheet]); // закрылась только карточка
  expect(document.body.style.overflow).toBe("hidden");
  expect(rowButton).toHaveFocus(); // фокус вернулся на строку, с которой открывали

  await userEvent.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.body.style.overflow).toBe("");
});

test("из карточки поверх подборки можно перейти к другой позиции, подборка при этом на месте", async () => {
  render(<Page />);
  await userEvent.click(screen.getByRole("button", { name: "Чёрный без сахара" }));
  await userEvent.click(within(screen.getAllByTestId("habit-item")[0]).getByRole("button"));
  expect(screen.getAllByRole("dialog")).toHaveLength(2);
  await userEvent.click(screen.getAllByRole("dialog")[1].querySelector<HTMLButtonElement>('[aria-label="Закрыть"]')!);
  expect(screen.getAllByRole("dialog")).toHaveLength(1);
  expect(screen.getByRole("dialog", { name: TITLES.black })).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Закрыть" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.body.style.overflow).toBe("");
});
