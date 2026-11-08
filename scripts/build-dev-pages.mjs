// Сборка со служебными страницами /dev/art и /dev/card в out-dev/ (боевой out/ не трогает).
// В обычную сборку (`npm run build`) эти страницы не попадают: см. next.config.ts (DEV_PAGES=1 включает `page.dev.tsx`).
// Отдельно: `npm run build:dev-pages`. Скрипты art-shots.mjs и card-shots.mjs вызывают её сами.
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));

export function buildDevPages() {
  return new Promise((ok, fail) => {
    const build = spawn(process.execPath, ["node_modules/next/dist/bin/next", "build"], {
      cwd: projectRoot,
      env: { ...process.env, DEV_PAGES: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let log = "";
    build.stdout.on("data", (d) => (log += d));
    build.stderr.on("data", (d) => (log += d));
    build.on("exit", (code) => (code === 0 ? ok(log) : fail(new Error(`next build (DEV_PAGES=1) упал, код ${code}:\n${log}`))));
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(await buildDevPages());
  console.log("готово: out-dev/ (со страницами /dev/art и /dev/card)");
}
