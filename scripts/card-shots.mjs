// Скриншоты и проверка в живом браузере для /dev/card (строки меню — все позиции на 360 px — и шторка позиции).
// `node scripts/card-shots.mjs` сам собирает сайт со служебными страницами в out-dev/ (`DEV_PAGES=1`, см. next.config.ts;
// боевой out/ не трогает, в нём страниц /dev/* нет).
// По dev-серверу: `BASE=http://localhost:3220 node scripts/card-shots.mjs` (сервер уже запущен как `DEV_PAGES=1 npm run dev`).
// Снимки — в scripts/shots/card-*.png; последняя строка вывода — `ok` или первая найденная проблема.
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright-core";

import { buildDevPages } from "./build-dev-pages.mjs";
import { serve } from "./serve-out.mjs";

const out = fileURLToPath(new URL("./shots/", import.meta.url));
await mkdir(out, { recursive: true });

const origin = process.env.BASE ?? "http://127.0.0.1:3221";
if (!process.env.BASE) await buildDevPages();
const server = process.env.BASE ? null : await serve(3221, "out-dev");
const browser = await chromium.launch({ channel: "chrome" });
const problems = [];
const check = (ok, what) => {
  if (!ok) problems.push(what);
};

try {
  // Телефон 360 px: самая узкая ширина из дизайна
  const page = await browser.newPage({ viewport: { width: 360, height: 800 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // «Failed to load resource» без адреса не говорит ничего — вместо него смотрим на ответы 4xx/5xx; favicon.ico у концепта нет
  page.on("console", (m) => m.type() === "error" && !m.text().startsWith("Failed to load resource") && errors.push(m.text()));
  page.on("response", (r) => r.status() >= 400 && !r.url().endsWith("/favicon.ico") && errors.push(`${r.status()} ${r.url()}`));
  await page.goto(`${origin}/dev/card`, { waitUntil: "networkidle" });
  // меряем со своим шрифтом (Onest), а не с запасным, на который страница переключается, пока он грузится
  await page.evaluate(() => document.fonts.ready);

  check(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "страница шире экрана 360 px");

  const blocks = await page.locator("section[id^=block-]").evaluateAll((els) => els.map((e) => e.id));
  for (const id of blocks) {
    const path = `${out}card-${id}.png`;
    await page.locator(`#${id}`).screenshot({ path });
    console.log(path);
  }

  // Каждая строка страницы, включая блок «всё меню» (#all-items): кнопка не ниже 44 px; название не обрезано
  // (ни многоточием, ни скрытым переполнением) и занимает не больше четырёх строк (самое длинное на 360 px — четыре); цена (и «примерно» под ней) целиком
  // внутри строки и не налезает на текст названия; ничего не торчит за правый край строки.
  const rows = await page.locator("main section button").evaluateAll((els) =>
    els.map((b) => {
      const box = b.getBoundingClientRect();
      const name = b.querySelector("[id$='-name']");
      const price = b.querySelector("[id$='-price']");
      const note = b.querySelector("[id$='-pricenote']");
      const style = getComputedStyle(name);
      const lineHeight = parseFloat(style.lineHeight);
      const priceBox = price.getBoundingClientRect();
      const noteBox = note?.getBoundingClientRect();
      const inside = (r) => r.left >= box.left - 0.5 && r.right <= box.right + 0.5 && r.top >= box.top - 0.5 && r.bottom <= box.bottom + 0.5;
      const range = document.createRange();
      range.selectNodeContents(name);
      // у прямоугольника текста «область шрифта» чуть выше и ниже строки: по вертикали сужаем на 3 px,
      // иначе строка, начинающаяся ровно под ценой, засчитывалась бы как налезающая на неё
      const hits = (r) => [...range.getClientRects()].some((t) => t.left < r.right - 0.5 && t.right > r.left + 0.5 && t.top + 3 < r.bottom && t.bottom - 3 > r.top);
      const stray = [...b.querySelectorAll("*")].filter((e) => !e.closest("svg") && e.getBoundingClientRect().right > box.right + 0.5).length;
      return {
        title: name.textContent,
        height: box.height,
        nameLines: Math.round(name.getBoundingClientRect().height / lineHeight),
        clipped:
          name.scrollHeight > name.clientHeight + 1 || name.scrollWidth > name.clientWidth + 1 || style.textOverflow === "ellipsis" || style.overflow !== "visible" || (style.webkitLineClamp ?? "none") !== "none",
        priceInside: inside(priceBox) && (!noteBox || inside(noteBox)),
        priceOnScreen: priceBox.right <= window.innerWidth,
        overlap: hits(priceBox) || (noteBox ? hits(noteBox) : false),
        stray,
      };
    }),
  );
  for (const r of rows) {
    check(r.height >= 44, `строка «${r.title}» ниже 44 px`);
    check(r.nameLines <= 4, `название «${r.title}» занимает ${r.nameLines} строк(и), допустимо не больше четырёх`); // самое длинное («Пенне с куриной грудкой, …») на 360 px — 4 строки, без обрезки
    check(!r.clipped, `название «${r.title}» обрезано`);
    check(r.priceInside && r.priceOnScreen, `цена «${r.title}» не целиком внутри строки`);
    check(!r.overlap, `цена «${r.title}» налезает на название`);
    check(r.stray === 0, `в строке «${r.title}» ${r.stray} элементов торчат за правый край`);
  }
  const lines = (title) => rows.find((r) => r.title === title)?.nameLines;
  const penne = "Пенне с куриной грудкой, белыми грибами, шампиньонами в сливочном соусе";
  const trout = "Сырно-шпинатная вафля с форелью";
  console.log(`строк названия на 360 px: «Пенне…» ${lines(penne)}, «Сырно-шпинатная вафля с форелью» ${lines(trout)}, максимум по ${rows.length} строкам ${Math.max(...rows.map((r) => r.nameLines))}`);
  check(rows.filter((r) => r.title === penne).length >= 2 && lines(penne) !== undefined, "в проверку не попало самое длинное название");

  // шторка по тапу
  const shots = [
    ["#block-coffee", /^Латте ≈ 260/, "latte"],
    ["#block-pasta", /^Пенне с куриной/, "penne"],
    ["#block-raf", /^Раф «Фисташковый»/, "raf-pistachio"],
  ];
  for (const [scope, name, id] of shots) {
    await page.locator(scope).getByRole("button", { name }).click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    await page.waitForTimeout(450); // анимация выезда
    check((await page.evaluate(() => document.body.style.overflow)) === "hidden", `${id}: прокрутка страницы не заблокирована`);
    check(await dialog.evaluate((el) => el.contains(document.activeElement)), `${id}: фокус не ушёл в шторку`);
    await page.screenshot({ path: `${out}card-sheet-${id}-1.png` });
    await dialog.evaluate((el) => (el.querySelector("div.overflow-y-auto").scrollTop = 1e6));
    await page.waitForTimeout(100);
    await page.screenshot({ path: `${out}card-sheet-${id}-2.png` });
    console.log(`${out}card-sheet-${id}-1.png`, `${out}card-sheet-${id}-2.png`);
    await page.keyboard.press("Escape");
    check((await dialog.count()) === 0, `${id}: Escape не закрыл шторку`);
    check((await page.evaluate(() => document.body.style.overflow)) === "", `${id}: прокрутка не вернулась`);
  }

  // свайп вниз мышью за верхнюю полоску закрывает; короткий — нет
  await page.locator("#block-coffee").getByRole("button", { name: /^Латте ≈ 260/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  await page.waitForTimeout(450);
  const grab = await page.locator('[data-sheet="grabber"]').boundingBox();
  const x = grab.x + grab.width / 2;
  const y = grab.y + grab.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 40, { steps: 4 });
  await page.mouse.up();
  check((await dialog.count()) === 1, "короткий свайп закрыл шторку");
  await page.waitForTimeout(300);
  const g2 = await page.locator('[data-sheet="grabber"]').boundingBox();
  await page.mouse.move(x, g2.y + 20);
  await page.mouse.down();
  await page.mouse.move(x, g2.y + 20 + 140, { steps: 8 });
  await page.mouse.up();
  check((await dialog.count()) === 0, "свайп вниз на 140 px не закрыл шторку");

  // подложка закрывает; тап по паре внутри шторки открывает ту позицию и фокус остаётся внутри
  await page.locator("#block-coffee").getByRole("button", { name: /^Латте ≈ 260/ }).click();
  await dialog.waitFor();
  await page.waitForTimeout(450);
  await dialog.getByRole("button", { name: /Круассан «Наполеон»/ }).click();
  check((await dialog.getAttribute("aria-labelledby")) !== null && (await dialog.getByRole("heading", { level: 2 }).textContent()) === "Круассан «Наполеон»", "тап по паре не открыл круассан");
  check(await dialog.evaluate((el) => el.contains(document.activeElement)), "после перехода по паре фокус вышел из шторки");
  await page.mouse.click(180, 40); // подложка над шторкой
  await page.waitForTimeout(100);
  check((await dialog.count()) === 0, "тап по подложке не закрыл шторку");

  check(errors.length === 0, `ошибки в консоли: ${errors.join(" | ")}`);
  console.log(problems.length ? `PROBLEMS:\n- ${problems.join("\n- ")}` : "ok");
} finally {
  await browser.close();
  server?.close();
}
