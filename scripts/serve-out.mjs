// Крошечный статический сервер для out/ (после `npm run build`): только для скриншотов и Lighthouse.
// Запуск отдельно: `node scripts/serve-out.mjs` → http://127.0.0.1:3221, остановка — Ctrl+C.
// Другая папка (сборка со служебными страницами, out-dev/): `OUT_DIR=out-dev node scripts/serve-out.mjs`.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

const project = fileURLToPath(new URL("../", import.meta.url));
const defaultDir = process.env.OUT_DIR ?? "out";

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

async function find(root, urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0]);
  const base = resolve(root, "." + clean);
  if (!base.startsWith(root)) return null;
  for (const candidate of [base, base + ".html", join(base, "index.html")]) {
    try {
      if ((await stat(candidate)).isFile()) return candidate;
    } catch {
      // нет такого файла — пробуем следующий вариант
    }
  }
  return null;
}

/** Поднимает сервер и возвращает его; вызывающий обязан закрыть (`server.close()`). `dir` — папка сборки (по умолчанию out/). */
export function serve(port = 3221, dir = defaultDir) {
  const root = resolve(project, dir);
  const server = createServer(async (req, res) => {
    const file = await find(root, req.url ?? "/");
    if (!file) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("not found");
      return;
    }
    const type = types[extname(file)] ?? "application/octet-stream";
    let body = await readFile(file);
    const headers = { "content-type": type };
    // как любой настоящий хостинг: текстовое отдаём сжатым (иначе Lighthouse меряет вес без gzip)
    if (/^(text\/|application\/json|image\/svg)/.test(type) && /\bgzip\b/.test(req.headers["accept-encoding"] ?? "")) {
      body = gzipSync(body);
      headers["content-encoding"] = "gzip";
      headers.vary = "accept-encoding";
    }
    res.writeHead(200, headers);
    res.end(body);
  });
  return new Promise((ok, fail) => {
    server.once("error", fail);
    server.listen(port, "127.0.0.1", () => ok(server));
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await serve();
  console.log("http://127.0.0.1:3221");
}
