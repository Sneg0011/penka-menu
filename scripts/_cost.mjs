// Замер стоимости старта 3D-стаканчика под замедлением CPU ×4
import { chromium } from "playwright-core";
import { serve } from "./serve-out.mjs";
const server = await serve(3221);
const browser = await chromium.launch({ channel: "chrome", args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-gpu-rasterization"] });
const rate = Number(process.env.RATE ?? 4);
for (let run = 0; run < 2; run++) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await context.addInitScript(() => {
    Object.defineProperty(window, "OffscreenCanvas", { value: undefined });
    window.__tasks = [];
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__tasks.push({ start: Math.round(e.startTime), dur: Math.round(e.duration) }))).observe({ type: "longtask", buffered: true });
    window.__cupInserted = null;
    new MutationObserver((rs) => { for (const r of rs) for (const n of r.addedNodes) if (n.nodeName === "CANVAS" && n.dataset.cup && window.__cupInserted === null) window.__cupInserted = Math.round(performance.now()); }).observe(document, { childList: true, subtree: true });
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate });
  await page.goto("http://127.0.0.1:3221/", { waitUntil: "load" });
  await page.waitForFunction(() => document.querySelector("[data-cup-box]")?.dataset.cupMode === "3d", null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => {
    const chunk = performance.getEntriesByType("resource").filter((e) => /\.js$/.test(e.name) && e.startTime > performance.getEntriesByType("navigation")[0].loadEventEnd).map((e) => ({ n: e.name.split("/").pop(), s: Math.round(e.startTime), kb: Math.round(e.encodedBodySize / 1024) }));
    return { chunk, ins: window.__cupInserted, mode: document.querySelector("[data-cup-box]").dataset.cupMode, tasks: window.__tasks, load: Math.round(performance.getEntriesByType("navigation")[0].loadEventEnd) };
  });
  const from = r.chunk[0]?.s ?? 0;
  const inWin = r.tasks.filter((t) => t.start >= from - 200 && t.start <= (r.ins ?? 1e9) + 500);
  console.log(`run ${run} rate ${rate}: load ${r.load} chunk ${JSON.stringify(r.chunk)} inserted ${r.ins} mode ${r.mode}\n  tasks in window: ${inWin.map((t) => `${t.dur}@${t.start}`).join(", ")}\n  longest ${Math.max(0, ...inWin.map((t) => t.dur))} total blocking ${inWin.reduce((a, t) => a + Math.max(0, t.dur - 50), 0)}\n  all: ${r.tasks.map((t) => `${t.dur}@${t.start}`).join(", ")}`);
  await context.close();
}
await browser.close(); server.close();
