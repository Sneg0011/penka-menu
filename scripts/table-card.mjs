// Табличка на стол: A6 (105 × 148 мм) с QR-кодом на адрес меню.
//   MENU_URL=https://ваш-адрес/ node scripts/table-card.mjs       (или `npm run card`)
// Пишет print/table-card.html (одним файлом: шрифты и QR внутри, открывается и без интернета и без node_modules),
// затем через установленный Chrome (playwright-core) рисует print/table-card.png (300 dpi, 1240 × 1748) и
// print/table-card.pdf (105 × 148 мм, фон до края) и проверяет, что QR из PNG читается и даёт ровно MENU_URL
// (декодер jsQR; плюс проверка в уменьшенном виде — как с камеры телефона с вытянутой руки).
// `--html-only` — только HTML, без картинок и проверки.
// Адрес по умолчанию — заглушка https://example.com/penka: на карточке мелким шрифтом помечено, что адрес не настоящий.
// Типография обычно просит вылет 3 мм: тёмный фон тогда нужно дотянуть за обрез (в этой карточке он до самого края).
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

import { chromium } from "playwright-core";
import QRCode from "qrcode";

const root = fileURLToPath(new URL("../", import.meta.url));
const outDir = fileURLToPath(new URL("../print/", import.meta.url));
const PLACEHOLDER = "https://example.com/penka";
const url = (process.env.MENU_URL ?? "").trim() || PLACEHOLDER;
const isPlaceholder = url === PLACEHOLDER;
const htmlOnly = process.argv.includes("--html-only");

// ───── QR: матрица модулей → один <path> (горизонтальные серии сливаются), тихая зона 4 модуля ─────

const QUIET = 4;
const qr = QRCode.create(url, { errorCorrectionLevel: "H" });
const size = qr.modules.size;
let d = "";
for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; ) {
    if (!qr.modules.get(y, x)) {
      x++;
      continue;
    }
    let run = 1;
    while (x + run < size && qr.modules.get(y, x + run)) run++;
    d += `M${x + QUIET} ${y + QUIET}h${run}v1h-${run}z`;
    x += run;
  }
}
const qrSvg = `<svg class="qr" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size + 2 * QUIET} ${size + 2 * QUIET}" shape-rendering="crispEdges" role="img" aria-label="QR-код: ${url}"><rect width="100%" height="100%" fill="#f5e8d6"/><path d="${d}" fill="#1b110b"/></svg>`;

// Круговой контроль данных: что закодировано — то и должно быть адресом
const encoded = qr.segments.map((s) => Buffer.from(s.data).toString("utf8")).join("");
if (encoded !== url) throw new Error(`QR кодирует «${encoded}», ожидался «${url}»`);

// ───── Шрифты те же, что на сайте (@fontsource), вшиты в файл ─────

const fontFiles = [
  ["Unbounded Variable", "variable", "@fontsource-variable/unbounded/files/unbounded-cyrillic-wght-normal.woff2", "U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116"],
  ["Unbounded Variable", "variable", "@fontsource-variable/unbounded/files/unbounded-latin-wght-normal.woff2", "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"],
  ["Onest Variable", "variable", "@fontsource-variable/onest/files/onest-cyrillic-wght-normal.woff2", "U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116"],
  ["Onest Variable", "variable", "@fontsource-variable/onest/files/onest-latin-wght-normal.woff2", "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"],
  ["Marck Script", "400", "@fontsource/marck-script/files/marck-script-cyrillic-400-normal.woff2", "U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116"],
  ["Marck Script", "400", "@fontsource/marck-script/files/marck-script-latin-400-normal.woff2", "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"],
];
let fontFaces = "";
for (const [family, weight, file, range] of fontFiles) {
  const data = await readFile(`${root}node_modules/${file}`);
  fontFaces += `@font-face{font-family:"${family}";font-style:normal;font-display:block;font-weight:${weight === "variable" ? "200 900" : weight};src:url(data:font/woff2;base64,${data.toString("base64")}) format("woff2");unicode-range:${range}}\n`;
}

// ───── Вёрстка ─────

const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Табличка «Пенка» — QR на меню (концепт AVA)</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
${fontFaces}
@page { size: 105mm 148mm; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: #1b110b; }
html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
@media screen { html, body { background: #cfc6b6; } body { min-height: 100vh; display: grid; place-items: center; padding: 24px; } .card { box-shadow: 0 30px 60px -30px rgb(30 14 4 / 0.6); } }
/* В PDF карточка занимает всю страницу печатной вёрстки (подробности про страницу — у page.pdf ниже) */
@media print { .card { position: fixed; inset: 0; width: auto; height: auto; } }

.card {
  position: relative;
  width: 105mm;
  height: 148mm;
  overflow: hidden;
  color: #f5e8d6;
  font-family: "Onest Variable", system-ui, sans-serif;
  background:
    radial-gradient(90% 55% at 50% 0%, #4a2e1d 0%, rgb(74 46 29 / 0) 70%),
    linear-gradient(180deg, #2a1a10 0%, #1b110b 62%);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 9mm 9mm 7mm;
}
/* название как на первом экране сайта: Unbounded ExtraBold и рукописное «меню» поверх угла */
.mark { position: relative; display: inline-block; margin-top: 1mm; }
.mark b { display: block; font-family: "Unbounded Variable", "Onest Variable", sans-serif; font-weight: 800; font-size: 20.5mm; line-height: 0.9; letter-spacing: -0.05em; }
.mark i { position: absolute; right: -2.2mm; bottom: -6.6mm; font-family: "Marck Script", "Segoe Script", cursive; font-style: normal; font-size: 11.5mm; line-height: 1; color: #e0a769; text-shadow: 0 0 2.2mm #2a1a10, 0 0 1mm #2a1a10; transform: rotate(-4deg); }

.panel { margin-top: 11mm; width: 72mm; height: 72mm; border-radius: 6mm; overflow: hidden; background: #f5e8d6; box-shadow: 0 5mm 8mm -4mm rgb(0 0 0 / 0.55); }
.qr { display: block; width: 100%; height: 100%; }

.ask { margin-top: 7.5mm; text-align: center; font-weight: 500; font-size: 4.7mm; line-height: 1.28; letter-spacing: 0.002em; }
.ask span { color: #e0a769; }

.foot { margin-top: auto; width: 100%; display: flex; justify-content: space-between; align-items: baseline; gap: 4mm; font-size: 2.55mm; line-height: 1.3; color: #a8937c; }
.foot em { font-style: normal; text-align: right; }
</style>
</head>
<body>
<main class="card">
  <div class="mark"><b>Пенка</b><i>меню</i></div>
  <div class="panel">${qrSvg}</div>
  <p class="ask">Наведите камеру —<br><span>меню и подбор напитка</span></p>
  <p class="foot"><span>концепт AVA</span>${isPlaceholder ? `<em>адрес-заглушка — задайте MENU_URL</em>` : ""}</p>
</main>
</body>
</html>
`;

await mkdir(outDir, { recursive: true });
const htmlPath = `${outDir}table-card.html`;
await writeFile(htmlPath, html);
console.log(`${htmlPath}\n  QR: версия ${qr.version}, ${size}×${size} модулей, коррекция H, данные «${url}»${isPlaceholder ? " (заглушка)" : ""}`);

if (htmlOnly) process.exit(0);

// ───── PNG, PDF и проверка, что QR читается ─────

const browser = await chromium.launch({ channel: "chrome" });
try {
  const context = await browser.newContext({ viewport: { width: 420, height: 580 }, deviceScaleFactor: 300 / 96 });
  const page = await context.newPage();
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const missing = await page.evaluate(() => [["Unbounded Variable", "Пенка"], ["Onest Variable", "Наведите камеру"], ["Marck Script", "меню"]].filter(([f, text]) => !document.fonts.check(`16px "${f}"`, text)).map(([f]) => f));
  if (missing.length) throw new Error(`не загрузились шрифты: ${missing.join(", ")}`);

  // PNG снимается с экрана; серый фон страницы и тень на время снимка убираем — дробные доли пикселя по краям не светлеют
  await page.addStyleTag({ content: "html, body { background: #1b110b !important; } .card { box-shadow: none !important; }" });
  const pngPath = `${outDir}table-card.png`;
  const png = await page.locator(".card").screenshot({ path: pngPath });
  console.log(`${pngPath}`);
  const pdfPath = `${outDir}table-card.pdf`;
  await page.emulateMedia({ media: "print" });
  await page.pdf({ path: pdfPath, printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 }, preferCSSPageSize: true });
  // Chrome округляет страницу вверх (298,08 × 420 pt вместо 297,64 × 419,53), а красит только целые пиксели вёрстки (397 × 559 px):
  // справа и снизу остаётся белая кайма в доли миллиметра. Обрезаем страницу (MediaBox) по закрашенной области — получается A6 ± 0,1 мм.
  const pdf = (await readFile(pdfPath)).toString("latin1");
  const box = /\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/.exec(pdf);
  if (!box) throw new Error("в PDF не нашёлся MediaBox");
  const cropW = Math.round((105 / 25.4) * 96) * 0.75;
  const cropH = Math.round((148 / 25.4) * 96) * 0.75;
  await writeFile(pdfPath, Buffer.from(pdf.replace(box[0], `/MediaBox [0 ${(Number(box[2]) - cropH).toFixed(2)} ${cropW} ${box[2]}]`), "latin1"));
  console.log(`${pdfPath}  (A6 ± 0,1 мм: ${(cropW / 72 * 25.4).toFixed(2)} × ${(cropH / 72 * 25.4).toFixed(2)} мм)`);

  // Чтение QR из PNG декодером jsQR: как есть и в уменьшенном виде (камера телефона с вытянутой руки видит код куда мельче)
  const checker = await context.newPage();
  await checker.goto("about:blank");
  await checker.addScriptTag({ path: `${root}node_modules/jsqr/dist/jsQR.js` });
  const result = await checker.evaluate(async (b64) => {
    const blob = await (await fetch(`data:image/png;base64,${b64}`)).blob();
    const bitmap = await createImageBitmap(blob);
    const out = {};
    for (const [name, scale] of [["300dpi", 1], ["25%", 0.25], ["15%", 0.15]]) {
      const w = Math.round(bitmap.width * scale);
      const h = Math.round(bitmap.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bitmap, 0, 0, w, h);
      const code = window.jsQR(ctx.getImageData(0, 0, w, h).data, w, h);
      out[name] = { size: `${w}×${h}`, data: code ? code.data : null };
    }
    return { dims: `${bitmap.width}×${bitmap.height}`, out };
  }, png.toString("base64"));
  console.log(`  PNG ${result.dims}`);
  const bad = [];
  for (const [name, r] of Object.entries(result.out)) {
    console.log(`  jsQR ${name} (${r.size}): ${r.data === null ? "НЕ ЧИТАЕТСЯ" : r.data === url ? "читается, адрес совпал" : `прочитано другое: ${r.data}`}`);
    if (r.data !== url) bad.push(name);
  }
  if (bad.length) throw new Error(`QR не прочитался на размерах: ${bad.join(", ")}`);
  console.log("ok");
} finally {
  await browser.close();
}
