import { chromium } from "playwright-core";
import { serve } from "./serve-out.mjs";
const server = await serve(3221);
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--headless=new"] });
for (const env of [256, 64, 32, 16]) {
  const context = await browser.newContext({ viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const logs = [];
  page.on("console", (m) => m.text().startsWith("T ") && logs.push(m.text().slice(2)));
  await page.goto(`http://127.0.0.1:3221/?env=${env}`, { waitUntil: "load" });
  await page.waitForTimeout(7000);
  console.log("env", env, logs.join(" | "), await page.evaluate(() => document.querySelector("[data-cup-box]")?.dataset.cupMode));
  await context.close();
}
await browser.close(); server.close();
