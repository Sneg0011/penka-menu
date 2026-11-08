"use client";

import { useEffect, useRef } from "react";

/** Сцена рамки показывает QR только на широком экране (там же, где подписи по бокам). */
const WIDE = "(min-width: 1100px) and (min-height: 600px)";

/**
 * QR-код адреса этой страницы для сцены с компьютера: навёл телефон — меню открылось на телефоне.
 * Генератор (`qrcode`) грузится отдельным чанком и только на широком экране — на телефоне его нет.
 * Тёмные модули на светлом поле: так его читают все камеры.
 */
export function StageQr() {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia(WIDE).matches) return;
    let cancelled = false;
    import("qrcode")
      .then(({ toString }) => toString(window.location.href.split("#")[0], { type: "svg", errorCorrectionLevel: "M", margin: 0, color: { dark: "#1b110b", light: "#0000" } }))
      .then((svg) => {
        if (!cancelled && box.current) box.current.innerHTML = svg;
      })
      .catch(() => {
        // не вышло — остаётся подпись без кода, меню работает
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <div ref={box} className="pk-stage-qr-code" aria-hidden="true" />;
}
