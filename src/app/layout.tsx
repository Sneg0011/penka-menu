// Шрифты локально, с кириллицей (Global Constraints: никаких Google Fonts по CDN)
import "@fontsource-variable/unbounded";
import "@fontsource-variable/onest";
import "@fontsource/marck-script";
import "./globals.css";

import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Меню кофейни «Пенка» — концепт AVA AGENCY",
  description:
    "Концепт QR-меню кофейни «Пенка» (Челябинск): состав, вкус и крепость каждого напитка, подбор по привычке. Не официальный сайт.",
  // концепт без заказа: в поиск не отдаём
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1b110b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
