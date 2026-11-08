import type { NextConfig } from "next";

// Служебные страницы /dev/* (галерея рисунков, строки меню) лежат в src/app/dev/**/page.dev.tsx и в обычную
// сборку не попадают: `.dev.tsx` считается страницей только при DEV_PAGES=1. Такую сборку делают
// scripts/art-shots.mjs и scripts/card-shots.mjs — она уходит в out-dev/, а не в out/.
const withDevPages = process.env.DEV_PAGES === "1";

const nextConfig: NextConfig = {
  // статическая выгрузка в out/ — без серверных функций
  output: "export",
  // сборка со служебными страницами — рядом, в out-dev/: боевой out/ она не трогает
  distDir: withDevPages ? "out-dev" : ".next",
  pageExtensions: withDevPages ? ["tsx", "ts", "jsx", "js", "dev.tsx"] : ["tsx", "ts", "jsx", "js"],
  images: { unoptimized: true },
  // в домашней папке лежит чужой package-lock.json — корень проекта задаём явно
  turbopack: { root: __dirname },
  poweredByHeader: false,
};

export default nextConfig;
