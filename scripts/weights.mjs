// Вес собранного сайта (после `npm run build`): `node scripts/weights.mjs`.
// Next 16 / Turbopack не печатает First Load JS, поэтому считаем сами: скрипты, на которые ссылается out/index.html,
// сжатые gzip (уровень 9); отдельно — «ленивые» чанки (их страница подтягивает позже и не всегда), CSS, шрифты, HTML.
import { readdir, readFile } from "node:fs/promises";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const out = fileURLToPath(new URL("../out/", import.meta.url));
const html = await readFile(`${out}index.html`, "utf8");
const kb = (n) => `${(n / 1024).toFixed(1)} КБ`;
const size = async (path) => {
  const buf = await readFile(path);
  return { raw: buf.length, gz: gzipSync(buf, { level: 9 }).length };
};

const refs = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/g)].map((m) => ({ src: m[1], legacy: /\bnoModule\b/i.test(m[0]) }));
const sum = (items) => items.reduce((a, s) => ({ raw: a.raw + s.raw, gz: a.gz + s.gz }), { raw: 0, gz: 0 });
const sized = [];
for (const ref of refs) sized.push({ ...ref, ...(await size(`${out}${ref.src.replace(/^\//, "")}`)) });

const modern = sum(sized.filter((s) => !s.legacy));
const legacy = sum(sized.filter((s) => s.legacy));
console.log(`First Load JS для «/» (скрипты из out/index.html): ${kb(modern.raw)} raw / ${kb(modern.gz)} gzip`);
console.log(`  + полифилы для старых браузеров (noModule, современные их не качают): ${kb(legacy.raw)} raw / ${kb(legacy.gz)} gzip`);
console.log(`  вместе со всеми <script src>: ${kb(modern.raw + legacy.raw)} raw / ${kb(modern.gz + legacy.gz)} gzip`);

const referenced = new Set(sized.map((s) => basename(s.src)));
const chunks = (await readdir(`${out}_next/static/chunks`)).filter((f) => f.endsWith(".js") && !referenced.has(f));
for (const file of chunks) {
  const text = await readFile(`${out}_next/static/chunks/${file}`, "utf8");
  const s = await size(`${out}_next/static/chunks/${file}`);
  // генератор QR сцены с компьютера (StageQr) — тоже ленивый чанк; без этой метки он числился «шейдером»
  const what = /WebGLRenderer|REVISION/.test(text)
    ? "ленивый чанк: three.js + 3D-стаканчик"
    : /toSJIS|Reed-Solomon|getSymbolSize/.test(text)
      ? "ленивый чанк: генератор QR для сцены с компьютера"
      : "ленивый чанк: шейдер перелива фона";
  console.log(`${what} (${file}): ${kb(s.raw)} raw / ${kb(s.gz)} gzip`);
}

const css = (await readdir(`${out}_next/static/chunks`)).filter((f) => f.endsWith(".css"));
for (const file of css) {
  const s = await size(`${out}_next/static/chunks/${file}`);
  console.log(`CSS (${file}): ${kb(s.raw)} raw / ${kb(s.gz)} gzip`);
}
const h = await size(`${out}index.html`);
console.log(`HTML (out/index.html, с готовой разметкой всего меню): ${kb(h.raw)} raw / ${kb(h.gz)} gzip`);

const fonts = (await readdir(`${out}_next/static/media`)).filter((f) => f.endsWith(".woff2"));
let fontBytes = 0;
for (const f of fonts) fontBytes += (await readFile(`${out}_next/static/media/${f}`)).length;
console.log(`шрифты woff2 в сборке: ${fonts.length} файлов, ${kb(fontBytes)} (браузер берёт только нужные подмножества: кириллица и латиница)`);
