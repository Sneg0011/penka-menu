// Сценарии и скриншоты главной страницы меню в живом браузере (playwright-core + установленный Chrome).
// По собранному сайту: `npm run build`, затем `node scripts/shots.mjs <сценарий…>`.
// По уже запущенному dev-серверу: `BASE=http://localhost:3220 node scripts/shots.mjs <сценарий…>`.
//
// Сценарии (можно несколько подряд; без аргументов — все, кроме hydration):
//   jump-to-last-section — 390×844: посреди перелива «Кофе → Рафы» выбрать в карусели последний раздел
//                          (нажатием, как скринридер/клавиатура, и броском-свайпом); после остановки прокрутки
//                          у шапки цвет текста = `ink` последнего раздела, в карусели текущий — «Десерты»,
//                          фон под меню — цвет «Десертов» (перелив не застрял на полпути).
//   sections             — 390×844: первый экран, каждый раздел, футер и открытая шторка → scripts/shots/page-*.png
//   desktop              — 1440×900: телефон по центру, QR сцены читается и ведёт на страницу, раздел внутри рамки,
//                          шторка поверх телефона → scripts/shots/desktop-*.png
//   landscape            — 844×390 (телефон «лёжа»): рамки нет, страница прокручивается сама, шире окна не бывает; на границе
//                          рамки: 1440×590 — без рамки, 1440×600 (сцена с QR после расширения) и 1024×600 — с рамкой
//                          → scripts/shots/landscape-*.png
//   no-overflow-360      — 360×780: страницу прокручивают целиком, потом открывают шторки позиций с самыми длинными названиями
//                          и ценами; на каждом шаге страница не шире окна, цена в строке и в шторке видна целиком
//   habit                — 390×844: вход «Что вы обычно пьёте?» целиком на первом экране; тап по привычке открывает подборку,
//                          тап по строке — карточку поверх неё; Escape закрывает по одной, прокрутка возвращается;
//                          то же на 360 px и в рамке телефона на компьютере → scripts/shots/habit-*.png
//   fallback-without-webgl — 390×844, «уменьшить движение»: шейдера нет (на странице ни одного canvas), фон даёт
//                          слой перелива CSS-градиентом — у каждого раздела вычисленный фон слоя не белый и не прозрачный,
//                          а под разделом (текст и рисунки спрятаны) — цвет самого раздела.
//   pour                 — 390×844, WebGL: медленная прокрутка через границы «Кофе → Рафы» и «Вафли → Супы», кадры
//                          на t = 0 / 0,5 / 1 → scripts/shots/pour-*.png; на каждом кадре — наименьший контраст текста
//                          с фоном под ним (≥ 4,5); в покое кадры не рисуются; то же в рамке телефона → pour-desktop.png
//   pour-guard           — 390×844, `/?pour=slow` (к каждому кадру +30 мс): сторож видеокарты сначала снижает разрешение
//                          холста с 0,6 до 0,4 от CSS-пикселей, потом насовсем переводит слой на CSS-градиент; в момент, когда холст убран,
//                          градиент уже на месте (без пустого кадра); шапка перекрашивается, фон раздела верный,
//                          ошибок нет; после перехода на `/` без флага в той же вкладке шейдер не возвращается
//   hero-in-static-html  — `out/index.html` (без браузера): есть «Что вы обычно пьёте?», есть svg[data-cup="fallback"],
//                          нет `<canvas`: первый экран со стаканчиком-рисунком приходит без JS.
//   cup                  — 390×844 в Chrome с видеокартой (флаги ANGLE/D3D11, без OffscreenCanvas): через 4 с после load SVG-стаканчик
//                          подменяется 3D в той же рамке (без сдвига вёрстки), кадры на 0 / 50 / 100 % прокрутки первого экрана →
//                          scripts/shots/cup-*.png; в покое кадры не рисуются; прокрутили мимо — сцена остаётся, но не рисует;
//                          возврат из меню — на рамке уже 3D, рисунок и 3D не видны вместе
//                          (scripts/shots/cup-return.png); «уменьшить движение», вердикт перелива «css» и упавшая сборка
//                          сцены — только SVG, без утёкшего контекста.
//   hydration            — сам поднимает `next dev` (порт 3220), открывает меню и ищет в консоли
//                          предупреждения о расхождении разметки сервера и клиента; сервер потом гасит.
// Последняя строка вывода — `ok` или список проблем.
import { spawn } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";

import { chromium } from "playwright-core";

import { serve } from "./serve-out.mjs";

const out = fileURLToPath(new URL("./shots/", import.meta.url));
const projectRoot = fileURLToPath(new URL("../", import.meta.url));
await mkdir(out, { recursive: true });

const ALL = ["hero-in-static-html", "jump-to-last-section", "sections", "desktop", "landscape", "no-overflow-360", "habit", "fallback-without-webgl", "pour", "pour-guard", "cup"];
const wanted = process.argv.slice(2).length ? process.argv.slice(2) : ALL;
const unknown = wanted.filter((w) => ![...ALL, "hydration"].includes(w));
if (unknown.length) {
  console.log(`Неизвестный сценарий: ${unknown.join(", ")}. Есть: ${[...ALL, "hydration"].join(", ")}`);
  process.exit(1);
}

// Через сколько после `load` Hero берётся за 3D-стаканчик — то же значение, что CUP_START_DELAY_MS в src/motion/hero.ts
const CUP_START_DELAY = 4000;

const problems = [];
const check = (ok, what) => {
  if (!ok) problems.push(what);
};

const needsStatic = wanted.some((w) => ALL.includes(w)) && !process.env.BASE;
const origin = process.env.BASE ?? "http://127.0.0.1:3221";
const server = needsStatic ? await serve(3221) : null;
const browser = await chromium.launch({ channel: "chrome" });

/** Ошибки страницы и консоли (кроме «Failed to load resource» без адреса) и ответы 4xx/5xx. */
function watchErrors(page, errors) {
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && !m.text().startsWith("Failed to load resource") && errors.push(m.text()));
  page.on("response", (r) => r.status() >= 400 && !r.url().endsWith("/favicon.ico") && errors.push(`${r.status()} ${r.url()}`));
}

async function phone(options = {}, init) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, ...options });
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  const errors = [];
  watchErrors(page, errors);
  await page.goto(`${origin}/`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  return { context, page, errors };
}

/** Ждёт, пока окно прокрутки (экран телефона или страница) не простоит 300 мс. */
async function waitScrollStill(page) {
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        const root = document.querySelector("[data-scroll-root]");
        const scroller = root && getComputedStyle(root).overflowY === "auto" ? root : document.scrollingElement;
        let last = -1;
        let still = 0;
        const started = performance.now();
        const tick = () => {
          const y = scroller.scrollTop;
          still = y === last ? still + 16 : 0;
          last = y;
          if (still >= 300 || performance.now() - started > 6000) resolve();
          else setTimeout(tick, 16);
        };
        tick();
      }),
  );
}

/** Состояние шапки и карусели, когда цвета перестали меняться (переход цвета — 0,35 с). */
async function chromeState(page) {
  await page.waitForTimeout(450);
  return page.evaluate(() => {
    const header = document.querySelector("header");
    const nav = document.querySelector("nav[aria-label='Разделы меню']");
    const current = nav.querySelector("button[aria-current='true']");
    const navBox = nav.getBoundingClientRect();
    // какая подпись стоит по центру колеса
    const centered = [...nav.querySelectorAll("button")]
      .map((b) => {
        const r = b.querySelector("span").getBoundingClientRect();
        return { text: b.textContent, d: Math.abs(r.left + r.width / 2 - (navBox.left + navBox.width / 2)) };
      })
      .sort((a, b) => a.d - b.d)[0];
    const last = [...document.querySelectorAll("section")].at(-1);
    const toRgb = (hex) => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(", ")})`;
    return {
      color: getComputedStyle(header).color,
      lastInk: toRgb(last.style.getPropertyValue("--ink")),
      current: current?.textContent ?? null,
      centered: centered.text,
      centeredOffset: Math.round(centered.d),
      // верх последнего раздела должен стоять ровно под шапкой
      lastTopGap: Math.round(last.getBoundingClientRect().top - header.getBoundingClientRect().bottom),
    };
  });
}

/** Прокрутка в середину перелива «Кофе → Рафы»: верх «Рафов» на полпути от низа окна к шапке. */
async function scrollMidTransition(page) {
  await page.evaluate(() => {
    const raf = document.getElementById("raf");
    const header = document.querySelector("header");
    const line = header.getBoundingClientRect().bottom;
    const target = (window.innerHeight + line) / 2;
    window.scrollBy({ top: raf.getBoundingClientRect().top - target, behavior: "instant" });
  });
  await waitScrollStill(page);
}

// ───── Фон под текстом: снимок экрана → пиксели ─────

/** PNG (8 бит, RGB или RGBA — так снимает Chrome) → доступ к пикселям. */
function decodePng(buf) {
  let pos = 8;
  let width = 0;
  let height = 0;
  let depth = 0;
  let type = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const name = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (name === "IHDR") [width, height, depth, type] = [data.readUInt32BE(0), data.readUInt32BE(4), data[8], data[9]];
    else if (name === "IDAT") idat.push(data);
    else if (name === "IEND") break;
    pos += 12 + len;
  }
  if (depth !== 8 || (type !== 2 && type !== 6)) throw new Error(`PNG: не умею глубину ${depth} / тип ${type}`);
  const bpp = type === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * bpp;
  const px = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = y * (stride + 1) + 1;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[y * stride + x - bpp] : 0;
      const b = y ? px[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y ? px[(y - 1) * stride + x - bpp] : 0;
      let v = raw[line + x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const [pa, pb, pc] = [Math.abs(p - a), Math.abs(p - b), Math.abs(p - c)];
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      px[y * stride + x] = v & 255;
    }
  }
  return {
    width,
    height,
    at(x, y) {
      const i = (Math.min(height - 1, Math.max(0, Math.round(y))) * width + Math.min(width - 1, Math.max(0, Math.round(x)))) * bpp;
      return [px[i], px[i + 1], px[i + 2]];
    },
  };
}

const parseRgb = (css) => {
  const [r, g, b, a = 1] = css.match(/[\d.]+/g).map(Number);
  return { rgb: [r, g, b], a };
};
const hexRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
function luminance([r, g, b]) {
  const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrastRgb(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Ждёт n кадров страницы. */
const frames = (page, n = 2) =>
  page.evaluate((count) => new Promise((resolve) => {
    let k = 0;
    const tick = () => (++k >= count ? resolve() : requestAnimationFrame(tick));
    requestAnimationFrame(tick);
  }), n);

/** Снимок фона: на время снимка меню (`main` и футер) спрятано, шапка остаётся. */
async function backdrop(page, hide = "main, footer { visibility: hidden !important; }") {
  await page.evaluate((css) => {
    const s = document.createElement("style");
    s.id = "pk-shot-hide";
    s.textContent = css;
    document.head.append(s);
  }, hide);
  await frames(page, 2);
  const img = decodePng(await page.screenshot());
  await page.evaluate(() => document.getElementById("pk-shot-hide")?.remove());
  await frames(page, 1);
  return img;
}

/**
 * Наименьший контраст видимого текста меню с фоном прямо под ним. Буквы прячутся (`-webkit-text-fill-color`),
 * а цвет текста, подложки чипов и рисунки остаются — снимается ровно то, на чём текст стоит; в каждом
 * прямоугольнике строки берётся каждый второй пиксель. Текст под шапкой не считается — у шапки свой фон.
 */
async function textContrast(page, dpr) {
  const boxes = await page.evaluate(() => {
    const header = document.querySelector("header").getBoundingClientRect();
    const scroller = document.querySelector("[data-scroll-root]");
    const inner = scroller && getComputedStyle(scroller).overflowY === "auto";
    const screen = inner ? scroller.getBoundingClientRect() : { top: 0, left: 0, right: innerWidth, bottom: innerHeight };
    // скруглённые углы экрана телефона: текст за ними не виден
    const radius = inner ? parseFloat(getComputedStyle(scroller).borderBottomLeftRadius) || 0 : 0;
    const found = [];
    const walker = document.createTreeWalker(document.querySelector("main"), NodeFilter.SHOW_TEXT);
    for (let n; (n = walker.nextNode()); ) {
      if (!n.textContent.trim()) continue;
      const el = n.parentElement;
      if (el.closest(".sr-only") || getComputedStyle(el).visibility === "hidden") continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) {
        const top = Math.max(r.top, header.bottom + 1, screen.top);
        const bottom = Math.min(r.bottom, screen.bottom - 1);
        const left = Math.max(r.left, screen.left);
        const right = Math.min(r.right, screen.right - 1);
        if (bottom - top < 4 || right - left < 3) continue;
        found.push({ text: n.textContent.trim().slice(0, 28), color: getComputedStyle(el).color, x: left, y: top, w: right - left, h: bottom - top });
      }
    }
    return { found, screen: { left: screen.left, right: screen.right, top: screen.top, bottom: screen.bottom }, radius };
  });
  /** Точка внутри экрана со скруглёнными углами (на 2 px от края: сам край сглажен с рамкой). */
  const { screen, radius } = boxes;
  const visible = (x, y) => {
    const cx = Math.min(Math.max(x, screen.left + radius), screen.right - radius);
    const cy = Math.min(Math.max(y, screen.top + radius), screen.bottom - radius);
    return (x - cx) ** 2 + (y - cy) ** 2 <= Math.max(0, radius - 2) ** 2 && y <= screen.bottom - 2 && x <= screen.right - 2;
  };
  const img = await backdrop(page, "main * { -webkit-text-fill-color: transparent !important; -webkit-text-stroke-width: 0 !important; text-shadow: none !important; }");
  let worst = { ratio: Infinity, text: "—" };
  for (const b of boxes.found) {
    const fg = parseRgb(b.color);
    for (let y = Math.ceil(b.y * dpr) + 1; y < (b.y + b.h) * dpr - 1; y += 2) {
      for (let x = Math.ceil(b.x * dpr) + 1; x < (b.x + b.w) * dpr - 1; x += 2) {
        if (!visible(x / dpr, y / dpr)) continue;
        const bg = img.at(x, y);
        const ink = fg.a < 1 ? fg.rgb.map((c, i) => c * fg.a + bg[i] * (1 - fg.a)) : fg.rgb;
        const ratio = contrastRgb(ink, bg);
        if (ratio < worst.ratio) worst = { ratio, text: b.text, color: b.color, bg: `rgb(${bg.join(", ")})`, at: [Math.round(x / dpr), Math.round(y / dpr)] };
      }
    }
  }
  return { count: boxes.found.length, worst };
}

/** Цвет пикселя попадает в диапазон двух цветов фона раздела (по каждому каналу, с допуском на сглаживание). */
function inSectionRange(px, [c0, c1], slack = 4) {
  const [a, b] = [hexRgb(c0), hexRgb(c1)];
  return px.every((v, i) => v >= Math.min(a[i], b[i]) - slack && v <= Math.max(a[i], b[i]) + slack);
}

/** Цвета фона раздела из разметки (`--bg-0`, `--bg-1`). */
const sectionBg = (page, id) =>
  page.evaluate((sid) => {
    const el = document.getElementById(sid);
    return [el.style.getPropertyValue("--bg-0"), el.style.getPropertyValue("--bg-1")];
  }, id);

/** После прыжка фон под меню — целиком цвет раздела `id`, без застрявшего на полпути перелива. */
async function checkSettled(page, id, what) {
  await page.waitForTimeout(150);
  const range = await sectionBg(page, id);
  const img = await backdrop(page);
  const dpr = img.width / (await page.evaluate(() => innerWidth));
  for (const [x, y] of [[30, 130], [195, 300], [360, 520], [100, 780]]) {
    const px = img.at(x * dpr, y * dpr);
    check(inSectionRange(px, range), `${what}: фон в (${x}, ${y}) rgb(${px.join(", ")}), ожидался цвет раздела ${id} ${range.join("…")}`);
  }
}

/**
 * Прокрутка к переливу на границе перед разделом `nextId` с прогрессом `t` (как в useSectionProgress: верх
 * следующего раздела идёт от низа окна, а у короткого раздела — от его собственной высоты, к линии чтения).
 * Работает и на странице, и внутри рамки телефона.
 */
async function scrollToPour(page, nextId, t) {
  await page.evaluate(
    ({ id, t }) => {
      const root = document.querySelector("[data-scroll-root]");
      const inner = root && getComputedStyle(root).overflowY === "auto" ? root : null;
      const top0 = inner ? inner.getBoundingClientRect().top : 0;
      const view = inner ? inner.clientHeight : innerHeight;
      const line = document.querySelector("header").getBoundingClientRect().bottom - top0 + 2;
      const next = document.getElementById(id);
      const prev = next.previousElementSibling;
      const zone = Math.max(1, Math.min(view - line, next.getBoundingClientRect().top - prev.getBoundingClientRect().top));
      const target = line + (1 - t) * zone;
      (inner ?? window).scrollBy({ top: next.getBoundingClientRect().top - top0 - target, behavior: "instant" });
    },
    { id: nextId, t },
  );
  await waitScrollStill(page);
  await frames(page, 3);
}

/** Средняя разница каналов двух снимков в прямоугольнике (CSS px), 0…255. */
function meanDiff(a, b, box, dpr) {
  let sum = 0;
  let n = 0;
  for (let y = Math.ceil(box.y * dpr); y < (box.y + box.height) * dpr; y += 3)
    for (let x = Math.ceil(box.x * dpr); x < (box.x + box.width) * dpr; x += 3) {
      const [p, q] = [a.at(x, y), b.at(x, y)];
      sum += Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2]);
      n += 3;
    }
  return n ? sum / n : 0;
}

/** Прокрутка окна (страницы или экрана рамки) на `top` px от начала. */
async function scrollRootTo(page, top) {
  await page.evaluate((y) => {
    const root = document.querySelector("[data-scroll-root]");
    const inner = root && getComputedStyle(root).overflowY === "auto" ? root : null;
    (inner ?? window).scrollTo({ top: y, behavior: "instant" });
  }, top);
  await waitScrollStill(page);
  await frames(page, 3);
}

const scenarios = {
  async "hero-in-static-html"() {
    const html = await readFile(new URL("../out/index.html", import.meta.url), "utf8");
    check(html.includes("Что вы обычно пьёте?"), "hero: в out/index.html нет «Что вы обычно пьёте?»");
    check(/<svg[^>]*\sdata-cup="fallback"/.test(html), 'hero: в out/index.html нет svg[data-cup="fallback"]');
    check(!html.includes("<canvas"), "hero: в статической разметке out/index.html есть <canvas");
  },

  async cup() {
    // Отдельный Chrome с видеокартой (как oblako-review/scripts/capture.mjs): без флагов headless может уйти в программный рендер
    const gpu = await chromium.launch({ channel: "chrome", args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-gpu-rasterization"] });
    // кадры стаканчика: вызовы отрисовки WebGL в холсте внутри рамки стаканчика
    const countCupDraws = () => {
      // замер кадра в воркере в headless врёт — без OffscreenCanvas, как в capture.mjs
      Object.defineProperty(window, "OffscreenCanvas", { value: undefined });
      // сдвиги вёрстки (CLS) и момент, когда в рамку лёг холст 3D
      window.__shifts = [];
      new PerformanceObserver((list) => list.getEntries().forEach((e) => window.__shifts.push({ value: e.value, t: e.startTime }))).observe({ type: "layout-shift", buffered: true });
      window.__cupInserted = null;
      new MutationObserver((records) => {
        for (const r of records) for (const n of r.addedNodes) if (n.nodeName === "CANVAS" && n.dataset.cup && window.__cupInserted === null) window.__cupInserted = performance.now();
      }).observe(document, { childList: true, subtree: true });
      window.__cupDraws = 0;
      for (const name of ["drawElements", "drawArrays"]) {
        const orig = WebGL2RenderingContext.prototype[name];
        WebGL2RenderingContext.prototype[name] = function (...args) {
          if (this.canvas instanceof HTMLCanvasElement && this.canvas.closest("[data-cup-box]")) window.__cupDraws++;
          return orig.apply(this, args);
        };
      }
    };
    const draws = (page) => page.evaluate(() => window.__cupDraws);
    const open = async (options = {}, init = countCupDraws, waitUntil = "networkidle") => {
      const context = await gpu.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, ...options });
      await context.addInitScript(init);
      const page = await context.newPage();
      const errors = [];
      watchErrors(page, errors);
      await page.goto(`${origin}/`, { waitUntil });
      if (waitUntil === "networkidle") await page.evaluate(() => document.fonts.ready);
      return { context, page, errors };
    };
    const geometry = (page) =>
      page.evaluate(() => {
        const r = (el) => (el ? el.getBoundingClientRect().toJSON() : null);
        const box = document.querySelector("[data-cup-box]");
        const svg = box.querySelector('svg[data-cup="fallback"]');
        const canvas = box.querySelector("canvas");
        return {
          mode: box.dataset.cupMode,
          box: r(box),
          svg: r(svg),
          canvas: r(canvas),
          canvasPx: canvas ? { w: canvas.width, h: canvas.height } : null,
          svgOpacity: getComputedStyle(svg).opacity,
          canvasOpacity: canvas ? getComputedStyle(canvas).opacity : null,
          canvases: document.querySelectorAll("canvas").length,
          boxCanvases: box.querySelectorAll("canvas").length,
          swap: box.dataset.cupSwap ?? null,
          heading: r(document.querySelector("[role=group][aria-labelledby] h2")),
          h1: r(document.querySelector("h1")),
          line: document.querySelector("header").getBoundingClientRect().bottom + 2,
        };
      });
    const same = (a, b) => a && b && ["x", "y", "width", "height"].every((k) => Math.abs(a[k] - b[k]) <= 0.5);

    try {
      const { context, page, errors } = await open({}, countCupDraws, "domcontentloaded");
      try {
        // 1) сразу (до load) — SVG-стаканчик в своей рамке, холста нет
        const first = await geometry(page);
        check(first.mode === "svg" && first.svg && first.svgOpacity === "1" && first.canvases === 0, `cup: до load не только SVG-стаканчик (${JSON.stringify({ mode: first.mode, svg: first.svgOpacity, canvases: first.canvases })})`);
        await page.waitForLoadState("networkidle");
        await page.evaluate(() => document.fonts.ready);
        const fold = await geometry(page);
        check(fold.h1.bottom <= 844 && fold.heading.bottom <= 844, `cup: заголовок или «Что вы обычно пьёте?» ниже сгиба (${Math.round(fold.heading.bottom)})`);
        // донышко — на CUP_VIEW.baseY / height = 352 / 436 высоты рамки (src/motion/hero.ts)
        check(fold.box.top + (352 / 436) * fold.box.height <= 844 - 12, `cup: донышко стаканчика у самого сгиба или ниже (верх рамки ${Math.round(fold.box.top)}, высота ${Math.round(fold.box.height)})`);

        // 2) после load и простоя — 3D в той же рамке, SVG растворяется, вёрстка не сдвигается
        await page.waitForFunction(() => document.querySelector("[data-cup-box]")?.dataset.cupMode === "3d", null, { timeout: 12000 }).catch(() => {});
        await page.waitForTimeout(700);
        const g = await geometry(page);
        check(g.mode === "3d", `cup: 3D не включилось (data-cup-mode=${g.mode})`);
        check(g.boxCanvases === 1, `cup: в рамке стаканчика ${g.boxCanvases} холстов, ожидался один`);
        check(g.swap === "fade", `cup: первая загрузка в начале страницы должна растворяться (data-cup-swap=${g.swap})`);
        // 3D берётся за дело не раньше, чем через CUP_START_DELAY после load: первые секунды — самой странице
        const sinceLoad = await page.evaluate(() => window.__cupInserted - performance.getEntriesByType("navigation")[0].loadEventEnd);
        check(sinceLoad >= CUP_START_DELAY - 100, `cup: холст 3D лёг в рамку через ${Math.round(sinceLoad)} мс после load, раньше ${CUP_START_DELAY} мс`);
        console.log(`cup: холст 3D лёг в рамку через ${Math.round(sinceLoad)} мс после load`);
        const swap = await page.evaluate(() => ({ at: window.__cupInserted, shift: window.__shifts.filter((e) => e.t >= window.__cupInserted - 1).reduce((a, e) => a + e.value, 0) }));
        check(swap.at !== null && swap.shift < 0.001, `cup: сдвиг вёрстки при подмене SVG → 3D (CLS ${swap.shift})`);
        check(same(g.canvas, g.box) && same(g.svg, g.box), `cup: холст не точно по рамке SVG (${JSON.stringify({ box: g.box, svg: g.svg, canvas: g.canvas })})`);
        check(g.canvasOpacity === "1" && g.svgOpacity === "0", `cup: после подмены холст ${g.canvasOpacity}, SVG ${g.svgOpacity}`);
        check(g.canvasPx && g.canvasPx.w <= Math.ceil(g.box.width * 1.5) + 1, `cup: плотность холста выше 1,5 (${JSON.stringify(g.canvasPx)} на ${g.box.width} px)`);

        // 3) кадры на 0 / 50 / 100 % прокрутки первого экрана: верх рамки едет от начального места к линии чтения
        const path = g.box.top - g.line;
        const shots = [];
        // + кадр 25 % (четверть оборота) — для проверки, что надпись уехала
        for (const p of [0, 0.25, 0.5, 1]) {
          await scrollRootTo(page, p * path);
          const name = `cup-${Math.round(p * 100)}.png`;
          const buf = await page.screenshot({ path: `${out}${name}` });
          console.log(`${out}${name}`);
          shots.push({ p, img: decodePng(buf), box: (await geometry(page)).box });
        }
        const [s0, s25, s50, s100] = shots;
        // для арт-дирекции: середина наклона
        await scrollRootTo(page, 0.9 * path);
        await page.screenshot({ path: `${out}cup-90.png` });
        console.log(`${out}cup-90.png`);
        const atEnd = (await geometry(page)).box;
        check(Math.abs(s100.box.top - g.line) <= 2, `cup: на 100 % верх рамки не у линии чтения (${Math.round(s100.box.top)} vs ${Math.round(g.line)})`);
        check(s100.box.bottom <= 844 && atEnd.bottom <= 844, "cup: на 100 % стаканчик не целиком на экране");
        // поворот виден: гильза (с надписью) в кадре 25 % не такая, как в 0 %; наклон — 100 % не как 50 %
        const sleeve = (b) => ({ x: b.x + 0.2 * b.width, y: b.y + 0.45 * b.height, width: 0.6 * b.width, height: 0.3 * b.height });
        const diff = (a, b) => meanDiff(a.img, { at: (x, y) => b.img.at(x, y + (b.box.top - a.box.top) * 2) }, sleeve(a.box), 2);
        const [d1, d2] = [diff(s0, s25), diff(s50, s100)];
        check(d1 > 4 && d2 > 4, `cup: стаканчик не меняется с прокруткой (разница кадров ${d1.toFixed(1)} / ${d2.toFixed(1)})`);
        console.log(`cup: разница кадров 0→25 % ${d1.toFixed(1)}, 50→100 % ${d2.toFixed(1)}`);

        // 4) кадры — только при прокрутке: в покое ни одного; при медленной прокрутке — каждый шаг
        let n0 = await draws(page);
        await page.waitForTimeout(1000);
        const idle = (await draws(page)) - n0;
        check(idle === 0, `cup: в покое ${idle} вызовов отрисовки за секунду`);
        await scrollRootTo(page, 0);
        n0 = await draws(page);
        const steps = 30;
        await page.evaluate(async ({ n, dy }) => {
          for (let k = 0; k < n; k++) {
            window.scrollBy({ top: dy, behavior: "instant" });
            await new Promise((r) => requestAnimationFrame(r));
          }
        }, { n: steps, dy: Math.round((0.5 * path) / steps) });
        await frames(page, 2);
        const moving = (await draws(page)) - n0;
        check(moving >= steps * 0.8, `cup: при медленной прокрутке ${moving} вызовов отрисовки на ${steps} шагов — стаканчик отстаёт`);
        console.log(`cup: в покое ${idle} вызовов отрисовки, при прокрутке ${moving} на ${steps} шагов`);

        // 5) прокрутили мимо первого экрана — сцена остаётся (пересборка блокировала поток ~0,5 с на каждом возврате),
        // но вне экрана не рисует ни одного кадра
        await page.evaluate(() => document.getElementById("raf").scrollIntoView({ behavior: "instant", block: "start" }));
        await waitScrollStill(page);
        await page.waitForTimeout(1200);
        const past = await geometry(page);
        const offStart = await draws(page);
        await page.evaluate(() => window.scrollBy({ top: 300, behavior: "instant" }));
        await frames(page, 4);
        await page.evaluate(() => window.scrollBy({ top: -300, behavior: "instant" }));
        await frames(page, 4);
        const offDraws = (await draws(page)) - offStart;
        check(past.mode === "3d" && past.canvas !== null && offDraws === 0, `cup: после прокрутки мимо сцена должна остаться и не рисовать (${JSON.stringify({ mode: past.mode, canvas: past.canvas !== null, offDraws })})`);

        // 6) возврат из меню: рамка над окном в зоне «рядом» (низ на 200 px выше окна) — на ней всё та же 3D-сцена
        // (её не отпускали), рисунок скрыт; потом медленно листаем вверх — пока рамка видна,
        // ни в одном кадре рисунок и 3D не видны вместе
        await page.evaluate(() => window.scrollBy({ top: document.querySelector("[data-cup-box]").getBoundingClientRect().bottom + 200, behavior: "instant" }));
        await waitScrollStill(page);
        await page.waitForFunction(() => document.querySelector("[data-cup-box]")?.dataset.cupMode === "3d", null, { timeout: 5000 }).catch(() => {});
        const ahead = await geometry(page);
        check(
          ahead.mode === "3d" && ahead.box.bottom < 0 && ahead.boxCanvases === 1 && ahead.svgOpacity === "0" && ahead.canvasOpacity === "1",
          `cup: возврат — на рамке не 3D-сцена (${JSON.stringify({ mode: ahead.mode, swap: ahead.swap, bottom: Math.round(ahead.box.bottom), canvases: ahead.boxCanvases, svg: ahead.svgOpacity, canvas: ahead.canvasOpacity })})`,
        );
        const entry = await page.evaluate(async () => {
          const box = document.querySelector("[data-cup-box]");
          const svg = box.querySelector('svg[data-cup="fallback"]');
          const header = document.querySelector("header").getBoundingClientRect().bottom;
          const seen = [];
          for (let k = 0; k < 200 && box.getBoundingClientRect().top < header + 2; k++) {
            window.scrollBy({ top: -6, behavior: "instant" });
            await new Promise((r) => requestAnimationFrame(r));
            const r = box.getBoundingClientRect();
            if (r.bottom <= header) continue; // ещё под шапкой — не видна
            const canvas = box.querySelector("canvas");
            seen.push({ bottom: Math.round(r.bottom), svg: Number(getComputedStyle(svg).opacity), canvas: canvas ? Number(getComputedStyle(canvas).opacity) : 0 });
          }
          return seen;
        });
        const both = entry.filter((e) => e.svg > 0 && e.canvas > 0);
        const svgOnly = entry.filter((e) => e.svg > 0);
        check(entry.length > 10, `cup: возврат — рамка не показалась (${entry.length} кадров)`);
        check(both.length === 0 && svgOnly.length === 0, `cup: возврат — рисунок виден рядом с 3D в ${both.length} кадрах, рисунок вместо 3D в ${svgOnly.length} (первый: ${JSON.stringify(entry[0])})`);
        console.log(`cup: возврат — кадров с рамкой на экране ${entry.length}, из них с рисунком поверх/вместо 3D ${svgOnly.length}`);
        // кадр возврата: верх рамки у линии чтения (p = 1)
        await page.evaluate(() => {
          const box = document.querySelector("[data-cup-box]");
          const line = document.querySelector("header").getBoundingClientRect().bottom + 2;
          window.scrollBy({ top: box.getBoundingClientRect().top - line, behavior: "instant" });
        });
        await waitScrollStill(page);
        await frames(page, 3);
        await page.screenshot({ path: `${out}cup-return.png` });
        console.log(`${out}cup-return.png`);

        await scrollRootTo(page, 0);
        await page.waitForFunction(() => document.querySelector("[data-cup-box]")?.dataset.cupMode === "3d", null, { timeout: 5000 }).catch(() => {});
        const back = await geometry(page);
        check(back.mode === "3d" && back.canvas !== null && back.boxCanvases === 1, `cup: вернулись наверх — 3D не вернулось (${back.mode}, холстов ${back.boxCanvases})`);
        check(errors.length === 0, `cup: ошибки на странице: ${errors.join(" | ")}`);
      } finally {
        await context.close();
      }

      // 6) «уменьшить движение» и вердикт сторожа перелива «css» — только SVG
      for (const [what, options, init] of [
        ["уменьшить движение", { reducedMotion: "reduce" }, countCupDraws],
        ["вердикт перелива css", {}, () => sessionStorage.setItem("pk-pour", "css")],
      ]) {
        const s = await open(options, init);
        try {
          await s.page.waitForTimeout(CUP_START_DELAY + 3500); // дольше задержки старта 3D — иначе «3D нет» ничего не доказывает
          const g = await geometry(s.page);
          check(g.mode === "svg" && g.canvas === null && g.svgOpacity === "1", `cup (${what}): ожидался только SVG (${JSON.stringify({ mode: g.mode, canvas: g.canvas })})`);
          check(s.errors.length === 0, `cup (${what}): ошибки на странице: ${s.errors.join(" | ")}`);
        } finally {
          await s.context.close();
        }
      }

      // 7) сборка сцены падает (драйвер не собрал шейдер): контекст отпущен, холста нет, SVG на месте, ошибок нет,
      // до перезагрузки сцена больше не собирается
      const failBuild = () => {
        window.__cupContexts = [];
        const getContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
          const ctx = getContext.call(this, type, ...rest);
          if (ctx && type === "webgl2" && this.dataset.cup) window.__cupContexts.push(ctx);
          return ctx;
        };
        const createProgram = WebGL2RenderingContext.prototype.createProgram;
        WebGL2RenderingContext.prototype.createProgram = function (...args) {
          if (this.canvas instanceof HTMLCanvasElement && this.canvas.dataset.cup) throw new Error("test: program");
          return createProgram.apply(this, args);
        };
      };
      const f = await open({}, failBuild);
      try {
        await f.page.waitForFunction(() => window.__cupContexts.length > 0, null, { timeout: 12000 }).catch(() => {});
        await f.page.waitForTimeout(800);
        const state = async () => ({
          ...(await geometry(f.page)),
          contexts: await f.page.evaluate(() => window.__cupContexts.length),
          leaked: await f.page.evaluate(() => window.__cupContexts.filter((c) => !c.isContextLost()).length),
        });
        const g1 = await state();
        check(g1.contexts >= 1, "cup (сборка падает): сборка сцены не началась — проверка ничего не проверила");
        check(g1.mode === "svg" && g1.boxCanvases === 0 && g1.svgOpacity === "1" && g1.leaked === 0, `cup (сборка падает): ${JSON.stringify({ mode: g1.mode, canvases: g1.boxCanvases, svg: g1.svgOpacity, contexts: g1.contexts, leaked: g1.leaked })}`);
        // ушли и вернулись — новой попытки нет
        await f.page.evaluate(() => document.getElementById("raf").scrollIntoView({ behavior: "instant", block: "start" }));
        await waitScrollStill(f.page);
        await scrollRootTo(f.page, 0);
        await f.page.waitForTimeout(1500);
        const g2 = await state();
        check(g2.contexts === g1.contexts && g2.mode === "svg" && g2.boxCanvases === 0, `cup (сборка падает): после возврата новая попытка (${JSON.stringify({ contexts: g2.contexts, mode: g2.mode })})`);
        check(f.errors.length === 0, `cup (сборка падает): ошибки на странице: ${f.errors.join(" | ")}`);
        console.log(`cup: сборка падает — контекстов создано ${g2.contexts}, не отпущено ${g2.leaked}, остался SVG`);
      } finally {
        await f.context.close();
      }
    } finally {
      await gpu.close();
    }
  },

  async "jump-to-last-section"() {
    const { context, page, errors } = await phone();
    try {
      // 1) посреди перелива — нажатие на «Десерты» (кнопка далеко за краем колеса: так её нажимает скринридер)
      await scrollMidTransition(page);
      const before = await page.evaluate(() => document.querySelector("nav button[aria-current='true']").textContent);
      check(before === "Кофе", `jump: перед прыжком текущий раздел «${before}», ожидался «Кофе»`);
      await page.getByRole("button", { name: "Десерты" }).dispatchEvent("click");
      await waitScrollStill(page);
      let s = await chromeState(page);
      check(s.color === s.lastInk, `jump (нажатие): цвет шапки ${s.color}, ожидался ${s.lastInk}`);
      check(s.current === "Десерты", `jump (нажатие): текущий в карусели «${s.current}»`);
      check(s.centered === "Десерты" && s.centeredOffset <= 2, `jump (нажатие): по центру колеса «${s.centered}» (смещение ${s.centeredOffset} px)`);
      check(Math.abs(s.lastTopGap) <= 2, `jump (нажатие): «Десерты» не встали под шапку (зазор ${s.lastTopGap} px)`);
      await checkSettled(page, "desserts", "jump (нажатие)");

      // 2) снова посреди перелива — бросок карусели пальцем влево до конца
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await waitScrollStill(page);
      await scrollMidTransition(page);
      const nav = await page.locator("nav[aria-label='Разделы меню']").boundingBox();
      const y = nav.y + nav.height / 2;
      await page.mouse.move(nav.x + nav.width * 0.92, y);
      await page.mouse.down();
      await page.mouse.move(nav.x + nav.width * 0.06, y, { steps: 6 });
      await page.mouse.up();
      await waitScrollStill(page);
      s = await chromeState(page);
      check(s.color === s.lastInk, `jump (свайп): цвет шапки ${s.color}, ожидался ${s.lastInk}`);
      check(s.current === "Десерты", `jump (свайп): текущий в карусели «${s.current}»`);
      check(s.centered === "Десерты" && s.centeredOffset <= 2, `jump (свайп): по центру колеса «${s.centered}» (смещение ${s.centeredOffset} px)`);
      await checkSettled(page, "desserts", "jump (свайп)");
      await page.screenshot({ path: `${out}jump-to-last-section.png` });
      console.log(`${out}jump-to-last-section.png`);
      check(errors.length === 0, `jump: ошибки на странице: ${errors.join(" | ")}`);
    } finally {
      await context.close();
    }

    // 3) «уменьшить движение»: прыжок без плавной прокрутки, шапка перекрашивается сразу
    const reduced = await phone({ reducedMotion: "reduce" });
    try {
      await scrollMidTransition(reduced.page);
      await reduced.page.getByRole("button", { name: "Десерты" }).dispatchEvent("click");
      await reduced.page.waitForTimeout(120);
      const s = await reduced.page.evaluate(() => {
        const last = [...document.querySelectorAll("section")].at(-1);
        const header = document.querySelector("header");
        return {
          gap: Math.round(last.getBoundingClientRect().top - header.getBoundingClientRect().bottom),
          color: getComputedStyle(header).color,
          ink: getComputedStyle(last).color,
          current: document.querySelector("nav button[aria-current='true']").textContent,
        };
      });
      check(Math.abs(s.gap) <= 2 && s.color === s.ink && s.current === "Десерты", `jump (reduced motion): ${JSON.stringify(s)}`);
      await checkSettled(reduced.page, "desserts", "jump (reduced motion)");
      check(reduced.errors.length === 0, `jump (reduced motion): ошибки на странице: ${reduced.errors.join(" | ")}`);
    } finally {
      await reduced.context.close();
    }
  },

  async sections() {
    const { context, page, errors } = await phone();
    try {
      check(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "sections: страница шире экрана 390 px");
      await page.screenshot({ path: `${out}page-first.png` });
      console.log(`${out}page-first.png`);
      // посреди перелива «Кофе → Рафы»: колесо карусели повернулось на полшага
      await scrollMidTransition(page);
      await page.screenshot({ path: `${out}page-mid-transition.png` });
      console.log(`${out}page-mid-transition.png`);
      const ids = await page.locator("section").evaluateAll((els) => els.map((e) => e.id));
      for (const id of ids) {
        await page.evaluate((sid) => document.getElementById(sid).scrollIntoView({ behavior: "instant", block: "start" }), id);
        await waitScrollStill(page);
        const s = await chromeState(page);
        const ink = await page.evaluate((sid) => {
          const hex = document.getElementById(sid).style.getPropertyValue("--ink");
          return `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(", ")})`;
        }, id);
        check(s.color === ink, `sections: на разделе ${id} шапка цвета ${s.color}, ожидался ${ink}`);
        await page.screenshot({ path: `${out}page-${id}.png` });
        console.log(`${out}page-${id}.png`);
      }
      await page.locator("footer").scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
      await waitScrollStill(page);
      await page.screenshot({ path: `${out}page-footer.png` });
      console.log(`${out}page-footer.png`);

      // шторка позиции открывается тапом по строке и закрывается Escape, прокрутка возвращается
      await page.evaluate(() => document.getElementById("raf").scrollIntoView({ behavior: "instant", block: "start" }));
      await waitScrollStill(page);
      await page.locator("#raf ul button").first().click();
      await page.waitForSelector("[role=dialog]");
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${out}page-sheet.png` });
      console.log(`${out}page-sheet.png`);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(150);
      check((await page.locator("[role=dialog]").count()) === 0, "sections: шторка не закрылась по Escape");
      check((await page.evaluate(() => document.body.style.overflow)) === "", "sections: после шторки прокрутка заблокирована");
      check(errors.length === 0, `sections: ошибки на странице: ${errors.join(" | ")}`);
    } finally {
      await context.close();
    }
  },

  async desktop() {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors = [];
    watchErrors(page, errors);
    try {
      await page.goto(`${origin}/`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      const frame = await page.evaluate(() => {
        const screen = document.querySelector("[data-scroll-root]");
        const r = screen.getBoundingClientRect();
        return {
          w: Math.round(r.width),
          h: Math.round(r.height),
          cx: Math.round(r.left + r.width / 2),
          cy: Math.round(r.top + r.height / 2),
          scrolls: getComputedStyle(screen).overflowY,
          pageScroll: document.documentElement.scrollHeight - window.innerHeight,
        };
      });
      check(frame.w === 390 && frame.h === 844, `desktop: экран телефона ${frame.w}×${frame.h}, ожидался 390×844`);
      check(Math.abs(frame.cx - 720) <= 1 && Math.abs(frame.cy - 450) <= 1, `desktop: телефон не по центру (${frame.cx}, ${frame.cy})`);
      check(frame.scrolls === "auto", "desktop: меню прокручивается не внутри телефона");
      check(frame.pageScroll <= 0, `desktop: сама страница прокручивается на ${frame.pageScroll} px`);

      // QR сцены нарисован и ведёт на эту страницу (декодер jsQR, как у таблички)
      await page.waitForSelector(".pk-stage-qr-code svg", { timeout: 5000 }).catch(() => {});
      await page.addScriptTag({ path: `${projectRoot}node_modules/jsqr/dist/jsQR.js` });
      const qr = await page.evaluate(async () => {
        const svg = document.querySelector(".pk-stage-qr-code svg");
        if (!svg) return null;
        const img = new Image();
        img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.outerHTML)}`;
        await img.decode();
        const c = document.createElement("canvas");
        c.width = c.height = 480;
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#f5e8d6";
        ctx.fillRect(0, 0, 480, 480);
        ctx.drawImage(img, 40, 40, 400, 400);
        return window.jsQR(ctx.getImageData(0, 0, 480, 480).data, 480, 480)?.data ?? "";
      });
      check(qr === `${origin}/`, `desktop: QR сцены ${qr === null ? "не нарисован" : `читается как «${qr}», ожидался «${origin}/»`}`);
      await page.screenshot({ path: `${out}desktop.png` });
      console.log(`${out}desktop.png`);

      // тап в карусели внутри рамки: экран доезжает до раздела, шапка перекрашивается
      await page.getByRole("button", { name: "Рафы и авторский" }).click();
      await waitScrollStill(page);
      const s = await chromeState(page);
      const rafInk = await page.evaluate(() => getComputedStyle(document.getElementById("raf")).color);
      check(s.color === rafInk && s.current === "Рафы и авторский", `desktop: после тапа «Рафы» шапка ${s.color} / текущий «${s.current}»`);
      await page.screenshot({ path: `${out}desktop-raf.png` });
      console.log(`${out}desktop-raf.png`);

      // шторка сидит поверх телефона, а не на весь экран
      await page.locator("#raf ul button").nth(1).click();
      await page.waitForSelector("[role=dialog]");
      await page.waitForTimeout(400);
      const sheet = await page.evaluate(() => {
        const r = document.querySelector("[data-sheet='root']").getBoundingClientRect();
        return { left: Math.round(r.left), width: Math.round(r.width), top: Math.round(r.top), height: Math.round(r.height) };
      });
      check(sheet.width === 390 && sheet.left === 525 && sheet.height === 844, `desktop: шторка не на телефоне (${JSON.stringify(sheet)})`);
      await page.screenshot({ path: `${out}desktop-sheet.png` });
      console.log(`${out}desktop-sheet.png`);
      await page.keyboard.press("Escape");
      check(errors.length === 0, `desktop: ошибки на странице: ${errors.join(" | ")}`);
    } finally {
      await context.close();
    }
  },

  async landscape() {
    // телефон «лёжа»: окно 844×390 — ниже 600 px, рамка не нужна (иначе вышел бы «телефон в телефоне»)
    const { context, page, errors } = await phone({ viewport: { width: 844, height: 390 } });
    try {
      const state = () =>
        page.evaluate(() => {
          const stage = document.querySelector(".pk-stage");
          const device = document.querySelector(".pk-device");
          const screen = document.querySelector("[data-scroll-root]");
          const header = document.querySelector("header");
          const notes = [...document.querySelectorAll(".pk-stage-note")].map((n) => getComputedStyle(n).display);
          const doc = document.documentElement;
          return {
            stagePosition: getComputedStyle(stage).position,
            devicePadding: getComputedStyle(device).paddingTop,
            screenOverflow: getComputedStyle(screen).overflowY,
            screenWidth: Math.round(screen.getBoundingClientRect().width),
            notes,
            scrollY: Math.round(window.scrollY),
            pageHeight: doc.scrollHeight,
            hOverflow: doc.scrollWidth - window.innerWidth,
            headerTop: Math.round(header.getBoundingClientRect().top),
          };
        });
      let s = await state();
      check(s.stagePosition !== "fixed" && s.devicePadding === "0px", `landscape: рамка телефона включилась (${JSON.stringify({ stage: s.stagePosition, padding: s.devicePadding })})`);
      check(s.screenOverflow !== "auto" && s.screenWidth === 844, `landscape: меню прокручивается внутри экрана ${s.screenWidth} px (overflow ${s.screenOverflow}), ожидалась страница 844 px`);
      check(s.notes.every((d) => d === "none"), `landscape: подписи рамки видны (${s.notes.join(", ")})`);
      check(s.pageHeight > 390 * 3, `landscape: страница не длиннее трёх экранов (${s.pageHeight} px)`);
      check(s.hOverflow <= 0, `landscape: страница шире окна на ${s.hOverflow} px`);
      await page.screenshot({ path: `${out}landscape-first.png` });
      console.log(`${out}landscape-first.png`);

      // страница прокручивается сама (колесом / пальцем), шапка остаётся липкой, вбок не уезжает
      for (const y of [400, 1500, 4000, 9000]) {
        await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
        await waitScrollStill(page);
        s = await state();
        check(Math.abs(s.scrollY - y) <= 2, `landscape: прокрутка страницы не сработала (scrollY ${s.scrollY} вместо ${y})`);
        check(s.headerTop === 0 && s.hOverflow <= 0, `landscape: на ${s.scrollY} px шапка на ${s.headerTop}, шире окна на ${s.hOverflow}`);
      }
      // дошли до футера
      await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
      await waitScrollStill(page);
      s = await state();
      check(s.scrollY + 390 >= s.pageHeight - 2, `landscape: до конца страницы не долистали (${s.scrollY} + 390 из ${s.pageHeight})`);
      await page.screenshot({ path: `${out}landscape-footer.png` });
      console.log(`${out}landscape-footer.png`);

      // карусель переносит к разделу и в странице без рамки
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await page.locator("nav[aria-label='Разделы меню']").getByRole("button", { name: "Чай", exact: true }).dispatchEvent("click");
      await waitScrollStill(page);
      const c = await chromeState(page);
      const gap = await page.evaluate(() => Math.round(document.getElementById("tea").getBoundingClientRect().top - document.querySelector("header").getBoundingClientRect().bottom));
      check(c.current === "Чай" && Math.abs(gap) <= 2, `landscape: прыжок к «Чаю» — текущий «${c.current}», зазор под шапкой ${gap} px`);
      await page.screenshot({ path: `${out}landscape-tea.png` });
      console.log(`${out}landscape-tea.png`);

      // шторка — во всё окно (рамки нет): не ниже окна и не шире
      await page.locator("#tea ul button").first().click();
      await page.waitForSelector("[role=dialog]");
      await page.waitForTimeout(400);
      const sheet = await page.evaluate(() => {
        const root = document.querySelector("[data-sheet='root']").getBoundingClientRect();
        const dialog = document.querySelector("[role=dialog]").getBoundingClientRect();
        return { root: [Math.round(root.left), Math.round(root.top), Math.round(root.width), Math.round(root.height)], dialogTop: Math.round(dialog.top), dialogBottom: Math.round(dialog.bottom), dialogWidth: Math.round(dialog.width), hOverflow: document.documentElement.scrollWidth - innerWidth };
      });
      check(sheet.root.join() === "0,0,844,390" && sheet.dialogTop >= 0 && sheet.dialogBottom <= 390 && sheet.hOverflow <= 0, `landscape: шторка не по окну (${JSON.stringify(sheet)})`);
      await page.screenshot({ path: `${out}landscape-sheet.png` });
      console.log(`${out}landscape-sheet.png`);
      await page.keyboard.press("Escape");
      check(errors.length === 0, `landscape: ошибки на странице: ${errors.join(" | ")}`);

      // граница рамки по высоте — 600 px (по ширине 768 px проверяют desktop и sections); на живой странице
      for (const [w, h, frame] of [[1440, 590, false], [1440, 600, true], [1024, 600, true], [1024, 599, false]]) {
        await page.setViewportSize({ width: w, height: h });
        await page.waitForTimeout(200);
        const f = await page.evaluate(() => ({
          fixed: getComputedStyle(document.querySelector(".pk-stage")).position === "fixed",
          overflow: getComputedStyle(document.querySelector("[data-scroll-root]")).overflowY,
          notes: [...document.querySelectorAll(".pk-stage-note")].map((n) => getComputedStyle(n).display),
          hOverflow: document.documentElement.scrollWidth - innerWidth,
        }));
        const noteShown = f.notes.some((d) => d !== "none");
        check(f.fixed === frame && (f.overflow === "auto") === frame && (w < 1100 ? !noteShown : noteShown === frame) && f.hOverflow <= 0, `landscape: ${w}×${h} — ожидалась ${frame ? "рамка" : "страница"} (${JSON.stringify(f)})`);
        // страницу открыли узкой и расширили — на сцене не пустая карточка, а QR
        if (noteShown) {
          const qr = await page.waitForSelector(".pk-stage-qr-code svg", { timeout: 5000 }).then(() => true).catch(() => false);
          check(qr, `landscape: ${w}×${h} — сцена появилась после расширения окна, а QR на ней не нарисован`);
        }
        if (w === 1440) {
          await page.screenshot({ path: `${out}landscape-${w}x${h}.png` });
          console.log(`${out}landscape-${w}x${h}.png`);
        }
      }
      await page.setViewportSize({ width: 844, height: 390 });
      await page.waitForTimeout(200);
      check((await page.evaluate(() => getComputedStyle(document.querySelector("[data-scroll-root]")).overflowY)) !== "auto", "landscape: вернулись к 844×390 — рамка осталась");
      check(errors.length === 0, `landscape: ошибки после смены размера окна: ${errors.join(" | ")}`);
    } finally {
      await context.close();
    }
  },

  async "no-overflow-360"() {
    const { context, page, errors } = await phone({ viewport: { width: 360, height: 780 } });
    try {
      // строки меню: страница не шире окна, цена и название целиком внутри строки
      const rows = () =>
        page.evaluate(() => {
          const bad = [];
          for (const row of document.querySelectorAll("main ul button:has([id$='-price'])")) {
            const r = row.getBoundingClientRect();
            const price = row.querySelector("[id$='-price']");
            const name = row.querySelector("[id$='-name']");
            const p = price.getBoundingClientRect();
            const n = name.getBoundingClientRect();
            if (p.right > r.right + 0.5 || p.left < r.left - 0.5 || price.scrollWidth > price.clientWidth + 1) bad.push(`цена «${price.textContent}» у «${name.textContent}»: ${Math.round(p.left)}…${Math.round(p.right)} при строке ${Math.round(r.left)}…${Math.round(r.right)}`);
            if (n.right > r.right + 0.5 || name.scrollWidth > name.clientWidth + 1) bad.push(`название «${name.textContent}» выходит за строку`);
            if (r.right > innerWidth + 0.5) bad.push(`строка «${name.textContent}» шире окна`);
          }
          return bad;
        });
      const wide = () => page.evaluate(() => ({ over: document.documentElement.scrollWidth - innerWidth, y: Math.round(scrollY) }));

      // 1) страницу прокручивают целиком; на каждом шаге — не шире окна и все строки в порядке
      let steps = 0;
      const total = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; ; y += 600) {
        await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
        await page.waitForTimeout(40);
        const s = await wide();
        steps++;
        check(s.over <= 0, `no-overflow-360: на прокрутке ${s.y} px страница шире окна на ${s.over} px`);
        for (const message of await rows()) check(false, `no-overflow-360: на прокрутке ${s.y} px — ${message}`);
        if (y >= total) break;
      }
      console.log(`no-overflow-360: шагов прокрутки ${steps}, высота страницы ${total} px`);

      // 2) шторки позиций: самые длинные названия, а ещё самые длинные цены — каждая должна уместиться в 360 px
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      const picks = await page.evaluate(() => {
        const all = [...document.querySelectorAll("main ul button:has([id$='-price'])")].map((row, index) => ({
          index,
          name: row.querySelector("[id$='-name']").textContent,
          price: row.querySelector("[id$='-price']").textContent,
          approx: !!row.querySelector("[id$='-pricenote']"),
        }));
        const byName = [...all].sort((a, b) => b.name.length - a.name.length).slice(0, 12);
        const byPrice = [...all].sort((a, b) => b.price.length - a.price.length || Number(b.approx) - Number(a.approx)).slice(0, 2);
        const seen = new Set();
        return [...byName, ...byPrice].filter((p) => !seen.has(p.index) && seen.add(p.index));
      });
      check(picks.length >= 12, `no-overflow-360: выбрано шторок ${picks.length}`);
      // названия из Review Focus плана — среди проверяемых обязательно
      for (const must of ["Пенне с куриной грудкой, белыми грибами, шампиньонами в сливочном соусе", "Сырно-шпинатная вафля с форелью"])
        check(picks.some((p) => p.name === must), `no-overflow-360: «${must}» не попала в проверку длинных названий`);
      for (const [n, pick] of picks.entries()) {
        const row = page.locator("main ul button:has([id$='-price'])").nth(pick.index);
        await row.scrollIntoViewIfNeeded();
        await row.click();
        await page.waitForSelector("[role=dialog]");
        await page.waitForTimeout(350);
        const m = await page.evaluate(() => {
          const dialog = document.querySelector("[role=dialog]");
          const d = dialog.getBoundingClientRect();
          const title = dialog.querySelector("h2");
          const price = [...dialog.querySelectorAll("p")].find((p) => /^(от |≈ )?\d+ ₽$/.test(p.textContent.trim()));
          const t = title.getBoundingClientRect();
          const p = price?.getBoundingClientRect();
          // всё содержимое шторки внутри её ширины (скрытый для глаз текст не считается)
          const outside = [...dialog.querySelectorAll("*")]
            .filter((el) => !el.closest(".sr-only") && !el.closest("[aria-hidden='true']") && el.getBoundingClientRect().width > 0)
            .filter((el) => el.getBoundingClientRect().right > d.right + 0.5 || el.getBoundingClientRect().left < d.left - 0.5)
            .map((el) => `${el.tagName.toLowerCase()} «${(el.textContent || "").trim().slice(0, 30)}»`);
          return {
            title: title.textContent,
            price: price?.textContent ?? null,
            over: document.documentElement.scrollWidth - innerWidth,
            priceRight: p ? Math.round(p.right) : null,
            priceLeft: p ? Math.round(p.left) : null,
            dialogRight: Math.round(d.right),
            titleRight: Math.round(t.right),
            titleClipped: title.scrollWidth > title.clientWidth + 1,
            priceClipped: price ? price.scrollWidth > price.clientWidth + 1 : true,
            outside,
          };
        });
        check(m.over <= 0, `no-overflow-360: шторка «${m.title}» — страница шире окна на ${m.over} px`);
        check(m.price !== null && m.priceRight <= m.dialogRight && m.priceRight <= 360 && !m.priceClipped, `no-overflow-360: шторка «${m.title}» — цена «${m.price}» не видна целиком (${m.priceLeft}…${m.priceRight} при шторке до ${m.dialogRight})`);
        check(m.priceLeft === null || (m.titleRight <= m.priceLeft && !m.titleClipped), `no-overflow-360: шторка «${m.title}» — название (до ${m.titleRight}) налезает на цену (с ${m.priceLeft})`);
        check(m.outside.length === 0, `no-overflow-360: шторка «${m.title}» — вылезают за край: ${m.outside.slice(0, 4).join(", ")}`);
        if (n === 0) {
          await page.screenshot({ path: `${out}no-overflow-360-sheet.png` });
          console.log(`${out}no-overflow-360-sheet.png`);
        }
        await page.keyboard.press("Escape");
        await page.waitForTimeout(150);
      }
      console.log(`no-overflow-360: шторок открыто ${picks.length}: ${picks.map((p) => `«${p.name}»`).join(", ")}`);
      check(errors.length === 0, `no-overflow-360: ошибки на странице: ${errors.join(" | ")}`);
    } finally {
      await context.close();
    }
  },

  async habit() {
    const title = "Людям, которые обычно пьют растворимый с молоком, понравилось";
    const dialogs = (page) => page.locator("[role=dialog]");
    const { context, page, errors } = await phone();
    try {
      // вход есть уже в статической разметке — до гидратации
      const html = await (await fetch(`${origin}/`)).text();
      check(html.includes("Что вы обычно пьёте?") && html.includes("Капучино из сетевых кофеен"), "habit: входа нет в статической разметке");

      // 1) вход целиком над сгибом, под названием, кнопки не меньше 44 px
      const entry = page.getByRole("group", { name: "Что вы обычно пьёте?" });
      const buttons = entry.getByRole("button");
      check((await buttons.count()) === 7, `habit: кнопок ${await buttons.count()}, ожидалось 7`);
      const geo = await page.evaluate(() => {
        const rect = (el) => el.getBoundingClientRect();
        const group = document.querySelector("[role=group][aria-labelledby]");
        const btns = [...group.querySelectorAll("button")].map((b) => ({ ...rect(b).toJSON(), clipped: [...b.querySelectorAll("span")].some((s) => s.scrollWidth > s.clientWidth + 1) }));
        return {
          headerBottom: rect(document.querySelector("header")).bottom,
          h1Bottom: rect(document.querySelector("h1")).bottom,
          groupTop: rect(group).top,
          minH: Math.min(...btns.map((b) => b.height)),
          bottom: Math.max(...btns.map((b) => b.bottom)),
          left: Math.min(...btns.map((b) => b.left)),
          right: Math.max(...btns.map((b) => b.right)),
          clipped: btns.some((b) => b.clipped),
          hScroll: document.documentElement.scrollWidth - window.innerWidth,
        };
      });
      check(geo.minH >= 44, `habit: кнопка ниже 44 px (${geo.minH})`);
      check(geo.bottom <= 844 - 24, `habit: вход не помещается над сгибом (низ на ${Math.round(geo.bottom)} px из 844)`);
      check(geo.groupTop > geo.h1Bottom && geo.groupTop > geo.headerBottom, "habit: вход не под названием страницы");
      check(geo.left >= 16 && geo.right <= 390 - 16, `habit: кнопки выходят за поля (${Math.round(geo.left)}…${Math.round(geo.right)})`);
      check(!geo.clipped && geo.hScroll <= 0, `habit: подпись обрезана или страница шире экрана (${JSON.stringify(geo)})`);
      await page.screenshot({ path: `${out}habit-entry.png` });
      console.log(`${out}habit-entry.png`);

      // 2) тап по привычке — подборка шторкой
      const scrollBefore = await page.evaluate(() => window.scrollY);
      await buttons.first().tap();
      await page.waitForSelector("[role=dialog]");
      await page.waitForTimeout(450);
      check((await dialogs(page).count()) === 1, "habit: после тапа не одна шторка");
      check((await page.getByRole("dialog", { name: title }).count()) === 1, "habit: у шторки не тот заголовок");
      const rows = page.locator("[data-testid=habit-item]");
      const names = await rows.evaluateAll((els) => els.map((e) => e.dataset.name));
      check(names.length > 0 && names[0] === "Латте", `habit: первая в подборке «${names[0]}», ожидался «Латте» (больше голосов)`);
      check((await page.getByText(/отзывы — пример/).count()) === 1, "habit: нет пометки «отзывы — пример»");
      check((await page.evaluate(() => document.body.style.overflow)) === "hidden", "habit: прокрутка страницы не заблокирована");
      await page.screenshot({ path: `${out}habit-sheet.png` });
      console.log(`${out}habit-sheet.png`);
      // нижняя часть подборки: последняя карточка доезжает целиком
      await page.evaluate(() => {
        const s = document.querySelector("[role=dialog] > div:last-child");
        s.scrollTop = s.scrollHeight;
      });
      await page.waitForTimeout(120);
      await page.screenshot({ path: `${out}habit-sheet-end.png` });
      console.log(`${out}habit-sheet-end.png`);
      await page.evaluate(() => (document.querySelector("[role=dialog] > div:last-child").scrollTop = 0));

      // 3) тап по строке — карточка поверх подборки
      const firstRow = rows.first().locator("button").first();
      await firstRow.tap();
      await page.waitForFunction(() => document.querySelectorAll("[role=dialog]").length === 2);
      await page.waitForTimeout(450);
      const stack = await page.evaluate(() => {
        const [lower, upper] = [...document.querySelectorAll("[role=dialog]")];
        const r = upper.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + 60);
        return {
          upperName: document.getElementById(upper.getAttribute("aria-labelledby"))?.textContent,
          lowerName: document.getElementById(lower.getAttribute("aria-labelledby"))?.textContent,
          hitInUpper: upper.contains(hit),
        };
      });
      check(stack.upperName === "Латте", `habit: поверх «${stack.upperName}», ожидалась карточка «Латте»`);
      check(stack.lowerName === title, `habit: внизу «${stack.lowerName}»`);
      check(stack.hitInUpper, "habit: карточка не поверх подборки (тап попадает в подборку)");
      await page.screenshot({ path: `${out}habit-sheet-item.png` });
      console.log(`${out}habit-sheet-item.png`);

      // 4) Escape закрывает только верхнюю; фокус возвращается на строку
      await page.keyboard.press("Escape");
      await page.waitForTimeout(150);
      check((await dialogs(page).count()) === 1, "habit: после первого Escape шторок не одна");
      check((await page.getByRole("dialog", { name: title }).count()) === 1, "habit: после первого Escape осталась не подборка");
      check((await page.evaluate(() => document.body.style.overflow)) === "hidden", "habit: после первого Escape прокрутка разблокирована, а подборка ещё открыта");
      check(await firstRow.evaluate((el) => el === document.activeElement), "habit: фокус не вернулся на строку подборки");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(150);
      check((await dialogs(page).count()) === 0, "habit: после второго Escape шторка осталась");
      check((await page.evaluate(() => document.body.style.overflow)) === "", "habit: после шторок прокрутка заблокирована");
      check((await page.evaluate(() => window.scrollY)) === scrollBefore, "habit: страница сдвинулась, пока шторки были открыты");
      // фокус вернулся на кнопку привычки, она подсвечена как выбранная
      check(await buttons.first().evaluate((el) => el === document.activeElement && el.hasAttribute("data-picked")), "habit: после закрытия фокус не на выбранной привычке");
      // выбранная привычка подсвечена акцентом, на ней виден фокус с клавиатуры (Escape — клавиатура)
      const ring = await buttons.first().evaluate((el) => {
        const cs = getComputedStyle(el);
        return { focusVisible: el.matches(":focus-visible"), shadow: cs.boxShadow };
      });
      check(ring.focusVisible && ring.shadow.includes("224, 167, 105"), `habit: у выбранной привычки не видны акцент и фокус (${JSON.stringify(ring)})`);
      await page.screenshot({ path: `${out}habit-entry-picked.png`, clip: { x: 0, y: 300, width: 390, height: 460 } });
      console.log(`${out}habit-entry-picked.png`);

      // 5) другие привычки: чай (янтарные карточки) и «вообще не пью кофе» (свой заголовок)
      await entry.getByRole("button", { name: "Чай" }).tap();
      await page.getByRole("dialog", { name: "Людям, которые обычно пьют чай, понравилось" }).waitFor();
      await page.waitForTimeout(450);
      await page.screenshot({ path: `${out}habit-sheet-tea.png` });
      console.log(`${out}habit-sheet-tea.png`);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(150);
      await entry.getByRole("button", { name: "Вообще не пью кофе" }).tap();
      await page.getByRole("dialog", { name: "Тем, кто не пьёт кофе, понравилось" }).waitFor();
      await page.waitForTimeout(450);
      await page.screenshot({ path: `${out}habit-sheet-no-coffee.png` });
      console.log(`${out}habit-sheet-no-coffee.png`);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(150);
      check((await page.evaluate(() => document.body.style.overflow)) === "", "habit: после всех шторок прокрутка заблокирована");
      check(errors.length === 0, `habit: ошибки на странице: ${errors.join(" | ")}`);
    } finally {
      await context.close();
    }

    // 6) узкий телефон 360 px: вход помещается, подписи не обрезаны
    const narrow = await phone({ viewport: { width: 360, height: 740 } });
    try {
      const geo = await narrow.page.evaluate(() => {
        const group = document.querySelector("[role=group][aria-labelledby]");
        const btns = [...group.querySelectorAll("button")].map((b) => b.getBoundingClientRect());
        return {
          minH: Math.min(...btns.map((b) => b.height)),
          left: Math.min(...btns.map((b) => b.left)),
          right: Math.max(...btns.map((b) => b.right)),
          clipped: [...group.querySelectorAll("button span")].some((s) => s.scrollWidth > s.clientWidth + 1),
          hScroll: document.documentElement.scrollWidth - window.innerWidth,
        };
      });
      check(geo.minH >= 44 && geo.left >= 16 && geo.right <= 360 - 16 && !geo.clipped && geo.hScroll <= 0, `habit (360 px): ${JSON.stringify(geo)}`);
      await narrow.page.screenshot({ path: `${out}habit-entry-360.png` });
      console.log(`${out}habit-entry-360.png`);
      await narrow.page.getByRole("button", { name: "Капучино из сетевых кофеен" }).tap();
      await narrow.page.waitForSelector("[role=dialog]");
      await narrow.page.waitForTimeout(450);
      await narrow.page.screenshot({ path: `${out}habit-sheet-360.png` });
      console.log(`${out}habit-sheet-360.png`);
      await narrow.page.keyboard.press("Escape");
      check(narrow.errors.length === 0, `habit (360 px): ошибки на странице: ${narrow.errors.join(" | ")}`);
    } finally {
      await narrow.context.close();
    }

    // 7) с компьютера: вход и подборка внутри рамки телефона
    const desk = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const dp = await desk.newPage();
    const derrors = [];
    watchErrors(dp, derrors);
    try {
      await dp.goto(`${origin}/`, { waitUntil: "networkidle" });
      await dp.evaluate(() => document.fonts.ready);
      await dp.getByRole("button", { name: "Чёрный без сахара" }).click();
      await dp.getByRole("dialog", { name: "Людям, которые обычно пьют чёрный без сахара, понравилось" }).waitFor();
      await dp.waitForTimeout(450);
      const sheet = await dp.evaluate(() => {
        const r = document.querySelector("[data-sheet='root']").getBoundingClientRect();
        return { left: Math.round(r.left), width: Math.round(r.width) };
      });
      check(sheet.width === 390 && sheet.left === 525, `habit (компьютер): подборка не на экране телефона (${JSON.stringify(sheet)})`);
      await dp.screenshot({ path: `${out}habit-desktop.png` });
      console.log(`${out}habit-desktop.png`);
      await dp.keyboard.press("Escape");
      check(derrors.length === 0, `habit (компьютер): ошибки на странице: ${derrors.join(" | ")}`);
    } finally {
      await desk.close();
    }
  },

  async "fallback-without-webgl"() {
    const { context, page, errors } = await phone({ reducedMotion: "reduce" });
    try {
      // слой решает, чем рисовать, после load и простоя — даём ему время
      await page.waitForTimeout(1500);
      check((await page.locator("canvas").count()) === 0, "fallback: при «уменьшить движение» на странице есть canvas");
      const layer = page.locator("[data-pour-layer]");
      check((await layer.count()) === 1, "fallback: нет слоя перелива [data-pour-layer]");
      if ((await layer.count()) !== 1) return;
      const mode = await page.evaluate(() => document.documentElement.dataset.pour);
      check(mode === "css", `fallback: режим слоя «${mode}», ожидался «css»`);
      const ids = await page.locator("section").evaluateAll((els) => els.map((e) => e.id));
      for (const id of ids) {
        await page.evaluate((sid) => document.getElementById(sid).scrollIntoView({ behavior: "instant", block: "start" }), id);
        await waitScrollStill(page);
        await frames(page, 3);
        const bg = await layer.evaluate((el) => {
          const cs = getComputedStyle(el);
          return { color: cs.backgroundColor, image: cs.backgroundImage };
        });
        const transparent = bg.color === "transparent" || /^rgba\(.*,\s*0\)$/.test(bg.color);
        check(!transparent && bg.color !== "rgb(255, 255, 255)", `fallback: на разделе ${id} фон слоя ${bg.color}`);
        check(bg.image.startsWith("linear-gradient"), `fallback: на разделе ${id} у слоя нет градиента (${bg.image.slice(0, 40)})`);
        // под разделом — цвет раздела: меню прячем, смотрим на сам слой
        const range = await sectionBg(page, id);
        const img = await backdrop(page);
        for (const [x, y] of [[30, 160], [195, 400], [360, 640]]) {
          const px = img.at(x * 2, y * 2);
          check(inSectionRange(px, range), `fallback: на разделе ${id} в точке (${x}, ${y}) фон rgb(${px.join(", ")}), ожидался цвет раздела ${range.join("…")}`);
        }
      }
      await page.screenshot({ path: `${out}fallback-desserts.png` });
      console.log(`${out}fallback-desserts.png`);
      check(errors.length === 0, `fallback: ошибки на странице: ${errors.join(" | ")}`);
    } finally {
      await context.close();
    }
  },

  async pour() {
    // считаем кадры шейдера: в покое без прокрутки их быть не должно
    const countDraws = () => {
      window.__pourDraws = 0;
      const draw = WebGL2RenderingContext.prototype.drawArrays;
      WebGL2RenderingContext.prototype.drawArrays = function (...args) {
        window.__pourDraws++;
        return draw.apply(this, args);
      };
    };
    const draws = (page) => page.evaluate(() => window.__pourDraws);
    const minContrast = [];
    const { context, page, errors } = await phone({}, countDraws);
    try {
      await page.waitForFunction(() => document.documentElement.dataset.pour === "gl", null, { timeout: 10000 }).catch(() => {});
      check((await page.evaluate(() => document.documentElement.dataset.pour)) === "gl", "pour: шейдер не включился (html[data-pour] ≠ gl)");
      check((await page.locator("[data-pour-layer] canvas").count()) === 1, "pour: на слое не один canvas");
      // второй холст на странице может быть только у 3D-стаканчика первого экрана (сценарий cup)
      const stray = await page.evaluate(() => [...document.querySelectorAll("canvas")].filter((c) => !c.closest("[data-cup-box]")).length);
      check(stray === 1, `pour: на странице ${stray} canvas, кроме стаканчика (ожидался один — перелив)`);
      const box = await page.locator("[data-pour-layer] canvas").boundingBox();
      check(box && box.x === 0 && box.y === 0 && box.width === 390 && box.height >= 844, `pour: холст не на весь экран (${JSON.stringify(box)})`);

      for (const [from, to] of [["coffee", "raf"], ["waffles", "soups"]]) {
        // медленная прокрутка через границу: по 8 px за кадр от t = 0 до t = 1
        await scrollToPour(page, to, 0);
        const before = await draws(page);
        const steps = await page.evaluate((id) => {
          const next = document.getElementById(id);
          const line = document.querySelector("header").getBoundingClientRect().bottom + 2;
          return Math.round((next.getBoundingClientRect().top - line) / 8);
        }, to);
        await page.evaluate(async (n) => {
          for (let k = 0; k < n; k++) {
            window.scrollBy({ top: 8, behavior: "instant" });
            await new Promise((r) => requestAnimationFrame(r));
          }
        }, steps);
        const scrolled = (await draws(page)) - before;
        check(scrolled >= steps * 0.8, `pour: ${from}→${to}: при медленной прокрутке ${scrolled} кадров на ${steps} шагов — перелив отстаёт`);

        for (const t of [0, 0.5, 1]) {
          await scrollToPour(page, to, t);
          // шапка перекрашивается за 0,35 с
          await page.waitForTimeout(450);
          const name = `pour-${from}-${to}-${Math.round(t * 100)}.png`;
          await page.screenshot({ path: `${out}${name}` });
          console.log(`${out}${name}`);
          const c = await textContrast(page, 2);
          minContrast.push({ ...c.worst, where: `${from}→${to} t=${t}`, count: c.count });
          check(c.worst.ratio >= 4.5, `pour: ${from}→${to} t=${t}: контраст ${c.worst.ratio.toFixed(2)} у «${c.worst.text}» (${c.worst.color} на ${c.worst.bg}, ${c.worst.at})`);
        }
      }

      // покой: фронт на экране — дрейф не чаще 30 кадров в секунду; фронта нет — ни одного кадра
      await scrollToPour(page, "raf", 0.5);
      let n0 = await draws(page);
      await page.waitForTimeout(1000);
      const idleFront = (await draws(page)) - n0;
      check(idleFront > 0 && idleFront <= 34, `pour: в покое с фронтом на экране ${idleFront} кадров за секунду (ожидалось 1…34)`);
      await page.evaluate(() => document.getElementById("breakfast").scrollIntoView({ behavior: "instant", block: "start" }));
      await waitScrollStill(page);
      await page.evaluate(() => window.scrollBy({ top: 400, behavior: "instant" }));
      await waitScrollStill(page);
      n0 = await draws(page);
      await page.waitForTimeout(1000);
      const idleBody = (await draws(page)) - n0;
      check(idleBody === 0, `pour: в покое без фронта на экране ${idleBody} кадров за секунду`);
      console.log(`pour: кадров за секунду покоя — с фронтом ${idleFront}, без фронта ${idleBody}`);
      // на быстрой видеокарте сторож шейдер не трогает
      const kept = await page.evaluate(() => ({ mode: document.documentElement.dataset.pour, width: document.querySelector("[data-pour-layer] canvas")?.width }));
      check(kept.mode === "gl" && kept.width === Math.round(390 * 0.6), `pour: сторож понизил перелив на быстрой видеокарте (${JSON.stringify(kept)})`);
      check(errors.length === 0, `pour: ошибки на странице: ${errors.join(" | ")}`);
    } finally {
      await context.close();
    }

    // в рамке телефона: слой стоит на экране телефона, меню прокручивается поверх
    const desk = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const dp = await desk.newPage();
    const derrors = [];
    watchErrors(dp, derrors);
    try {
      await dp.goto(`${origin}/`, { waitUntil: "networkidle" });
      await dp.evaluate(() => document.fonts.ready);
      await dp.waitForFunction(() => document.documentElement.dataset.pour === "gl", null, { timeout: 10000 }).catch(() => {});
      await scrollToPour(dp, "raf", 0.5);
      await dp.waitForTimeout(450);
      const geo = await dp.evaluate(() => {
        const r = (el) => el.getBoundingClientRect().toJSON();
        return { canvas: document.querySelector("[data-pour-layer] canvas") && r(document.querySelector("[data-pour-layer] canvas")), screen: r(document.querySelector("[data-scroll-root]")), pageScroll: document.documentElement.scrollHeight - innerHeight };
      });
      const same = geo.canvas && ["x", "y", "width", "height"].every((k) => Math.abs(geo.canvas[k] - geo.screen[k]) <= 0.5);
      check(same, `pour (компьютер): холст не по экрану телефона (${JSON.stringify(geo)})`);
      check(geo.pageScroll <= 0, `pour (компьютер): страница прокручивается на ${geo.pageScroll} px`);
      await dp.screenshot({ path: `${out}pour-desktop.png` });
      console.log(`${out}pour-desktop.png`);
      const c = await textContrast(dp, 1);
      minContrast.push({ ...c.worst, where: "компьютер coffee→raf t=0.5", count: c.count });
      check(c.worst.ratio >= 4.5, `pour (компьютер): контраст ${c.worst.ratio.toFixed(2)} у «${c.worst.text}»`);
      check(derrors.length === 0, `pour (компьютер): ошибки на странице: ${derrors.join(" | ")}`);
    } finally {
      await desk.close();
    }

    for (const m of minContrast) console.log(`pour: контраст ${m.where}: мин. ${m.ratio.toFixed(2)} (строк текста ${m.count}; «${m.text}» ${m.color} на ${m.bg} в ${m.at})`);
    const worst = minContrast.reduce((a, b) => (b.ratio < a.ratio ? b : a));
    console.log(`pour: наименьший контраст текста за сценарий — ${worst.ratio.toFixed(2)} (${worst.where}, «${worst.text}»)`);
  },

  async "pour-guard"() {
    // в момент, когда холст убирают, слой уже должен быть залит градиентом — иначе мелькнёт пустой кадр
    const watchDemotion = () => {
      window.__pourDemotion = null;
      new MutationObserver((records) => {
        for (const r of records)
          for (const n of r.removedNodes)
            // холст 3D-стаканчика (data-cup) убирается только при потере контекста — это не понижение перелива
            if (n.nodeName === "CANVAS" && !n.hasAttribute("data-cup")) {
              const layer = document.querySelector("[data-pour-layer]");
              window.__pourDemotion = { mode: document.documentElement.dataset.pour, image: layer.style.backgroundImage.slice(0, 15), canvases: layer.querySelectorAll("canvas").length };
            }
      }).observe(document, { childList: true, subtree: true });
    };
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    await context.addInitScript(watchDemotion);
    const page = await context.newPage();
    const errors = [];
    watchErrors(page, errors);
    try {
      await page.goto(`${origin}/?pour=slow`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(() => document.documentElement.dataset.pour === "gl", null, { timeout: 10000 }).catch(() => {});
      check((await page.evaluate(() => document.documentElement.dataset.pour)) === "gl", "pour-guard: шейдер не включился до проверки");
      // медленная прокрутка через «Кофе → Рафы»: фронт на экране, сторож меряет кадры
      await scrollToPour(page, "raf", 0);
      const run = await page.evaluate(async () => {
        const widths = [];
        let demotedAt = -1;
        for (let k = 0; k < 160; k++) {
          window.scrollBy({ top: k < 90 ? 8 : -8, behavior: "instant" });
          await new Promise((r) => requestAnimationFrame(r));
          const w = document.querySelector("[data-pour-layer] canvas")?.width ?? 0;
          if (widths.at(-1) !== w) widths.push(w);
          if (demotedAt < 0 && document.documentElement.dataset.pour === "css") demotedAt = k;
        }
        return { widths, demotedAt };
      });
      console.log(`pour-guard: ширина холста по ходу — ${run.widths.join(" → ")}, переход на CSS на кадре ${run.demotedAt}`);
      check(run.widths[0] === Math.round(390 * 0.6) && run.widths.includes(Math.round(390 * 0.4)) && run.widths.at(-1) === 0, `pour-guard: не было шага «0,6 → 0,4 → CSS» (${run.widths.join(" → ")})`);
      check(run.demotedAt >= 0, "pour-guard: слой не перешёл на CSS");
      const state = await page.evaluate(() => {
        const layer = document.querySelector("[data-pour-layer]");
        // холст 3D-стаканчика живёт по своим правилам (сценарий cup): считаем только остальные
        const canvases = [...document.querySelectorAll("canvas")].filter((c) => !c.closest("[data-cup-box]")).length;
        return { mode: document.documentElement.dataset.pour, canvases, image: getComputedStyle(layer).backgroundImage.slice(0, 15), demotion: window.__pourDemotion, remembered: sessionStorage.getItem("pk-pour") };
      });
      check(state.mode === "css" && state.canvases === 0 && state.image === "linear-gradient", `pour-guard: после понижения ${JSON.stringify(state)}`);
      check(state.demotion && state.demotion.mode === "css" && state.demotion.image === "linear-gradient" && state.demotion.canvases === 0, `pour-guard: холст убран раньше, чем появился градиент (${JSON.stringify(state.demotion)})`);
      check(state.remembered === "css", "pour-guard: решение не запомнено на сессию");
      await page.screenshot({ path: `${out}pour-guard-css.png` });
      console.log(`${out}pour-guard-css.png`);

      // страница работает: шапка перекрашивается, под разделом — его цвет
      await page.locator("nav[aria-label='Разделы меню']").getByRole("button", { name: "Чай", exact: true }).dispatchEvent("click");
      await waitScrollStill(page);
      const s = await chromeState(page);
      const teaInk = await page.evaluate(() => getComputedStyle(document.getElementById("tea")).color);
      check(s.color === teaInk && s.current === "Чай", `pour-guard: после понижения шапка ${s.color} / текущий «${s.current}», ожидался «Чай» ${teaInk}`);
      await checkSettled(page, "tea", "pour-guard");
      // перелив на CSS по-прежнему следует за прокруткой
      await scrollToPour(page, "cold", 0.5);
      const c = await textContrast(page, 2);
      check(c.worst.ratio >= 4.5, `pour-guard: контраст ${c.worst.ratio.toFixed(2)} у «${c.worst.text}» на CSS-градиенте`);
      console.log(`pour-guard: CSS-перелив «Чай → Холодные» t=0.5 — мин. контраст ${c.worst.ratio.toFixed(2)}`);

      // решение одностороннее: в той же вкладке без флага шейдер не возвращается
      await page.goto(`${origin}/`, { waitUntil: "networkidle" });
      await page.waitForTimeout(CUP_START_DELAY + 3500); // дольше задержки старта 3D
      const again = await page.evaluate(() => ({ mode: document.documentElement.dataset.pour, canvases: document.querySelectorAll("canvas").length, cup: document.querySelector("[data-cup-box]")?.dataset.cupMode }));
      // и стаканчик на первом экране с тем же вердиктом остаётся рисунком: на странице ни одного холста
      check(again.mode === "css" && again.canvases === 0 && again.cup === "svg", `pour-guard: после перехода шейдер или 3D-стаканчик вернулись (${JSON.stringify(again)})`);
      check(errors.length === 0, `pour-guard: ошибки на странице: ${errors.join(" | ")}`);
    } finally {
      await context.close();
    }
  },

  async hydration() {
    const base = process.env.BASE;
    let dev = null;
    let devLog = "";
    if (!base) {
      dev = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", "3220"], { cwd: projectRoot, stdio: ["ignore", "pipe", "pipe"] });
      dev.stdout.on("data", (d) => (devLog += d));
      dev.stderr.on("data", (d) => (devLog += d));
      const started = Date.now();
      while (!/Ready in|ready started|Local:/i.test(devLog)) {
        if (Date.now() - started > 60000) throw new Error(`next dev не поднялся:\n${devLog}`);
        await new Promise((r) => setTimeout(r, 250));
      }
    }
    const url = `${base ?? "http://localhost:3220"}/`;
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const messages = [];
    page.on("console", (m) => messages.push(`${m.type()}: ${m.text()}`));
    page.on("pageerror", (e) => messages.push(`pageerror: ${e.message}`));
    try {
      // первый заход компилирует страницу; меряем второй, «тёплый»
      await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
      messages.length = 0;
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForTimeout(1500);
      const hydration = messages.filter((m) => /hydrat|did not match|didn't match|server rendered/i.test(m));
      check(hydration.length === 0, `hydration: ${hydration.join("\n  ")}`);
      const errorsOnly = messages.filter((m) => m.startsWith("error") || m.startsWith("pageerror"));
      check(errorsOnly.length === 0, `hydration: ошибки в консоли dev: ${errorsOnly.join(" | ")}`);
      console.log(`hydration: сообщений в консоли — ${messages.length}${messages.length ? `\n  ${messages.join("\n  ")}` : ""}`);
    } finally {
      await context.close();
      if (dev) {
        // next dev запускает дочерние процессы: на Windows гасим всё дерево
        if (process.platform === "win32") spawn("taskkill", ["/pid", String(dev.pid), "/T", "/F"], { stdio: "ignore" });
        else dev.kill("SIGTERM");
      }
    }
  },
};

try {
  for (const name of wanted) {
    console.log(`— ${name}`);
    await scenarios[name]();
  }
  console.log(problems.length ? `PROBLEMS:\n- ${problems.join("\n- ")}` : "ok");
} finally {
  await browser.close();
  server?.close();
}
