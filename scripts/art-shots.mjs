// Скриншоты галереи /dev/art: `node scripts/art-shots.mjs` (сам собирает сайт со служебными страницами
// в out-dev/ — `DEV_PAGES=1`, см. next.config.ts; боевой out/ не трогает, в нём страниц /dev/* нет).
// С id позиций (`node scripts/art-shots.mjs latte cappuccino`) — только крупные планы 220 px в art-zoom-<id>.png.
// Сервер поднимается и закрывается внутри скрипта; снимки — в scripts/shots/art-*.png.
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright-core";

import { buildDevPages } from "./build-dev-pages.mjs";
import { serve } from "./serve-out.mjs";

const out = fileURLToPath(new URL("./shots/", import.meta.url));
await mkdir(out, { recursive: true });

await buildDevPages();
const server = await serve(3221, "out-dev");
const browser = await chromium.launch({ channel: "chrome" });
const ids = process.argv.slice(2);
try {
  if (ids.length) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 2 });
    await page.goto("http://127.0.0.1:3221/dev/art", { waitUntil: "networkidle" });
    for (const id of ids) {
      const path = `${out}art-zoom-${id}.png`;
      await page.locator(`#grid-220 figure[data-item="${id}"]`).screenshot({ path });
      console.log(path);
    }
  }
  // 96 px — как на телефоне (DPR 2); 220 px — DPR 1, кусками по высоте.
  for (const [size, dpr, chunk] of ids.length ? [] : [[96, 2, 640], [220, 1, 1150]]) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: dpr });
    await page.goto("http://127.0.0.1:3221/dev/art", { waitUntil: "networkidle" });
    const box = await page.locator(`#grid-${size}`).boundingBox();
    if (!box) throw new Error(`нет #grid-${size}`);
    let part = 1;
    for (let y = box.y; y < box.y + box.height; y += chunk, part++) {
      const height = Math.min(chunk, box.y + box.height - y);
      const path = `${out}art-${size}-${part}.png`;
      await page.screenshot({ path, fullPage: true, clip: { x: box.x, y, width: box.width, height } });
      console.log(path);
    }
    if (size === 220) {
      const path = `${out}art-extra.png`;
      await page.locator("#extra").screenshot({ path });
      console.log(path);
    }
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
