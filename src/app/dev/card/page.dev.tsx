import type { Metadata } from "next";

import { CardPreview } from "./preview";

// Служебная страница: строки меню на фоне разделов (как на телефоне, 360 px) и шторка позиции. Из меню сюда ссылок нет.

export const metadata: Metadata = {
  title: "Карточки позиций — служебная страница",
  robots: { index: false, follow: false },
};

export default function CardPage() {
  return <CardPreview />;
}
