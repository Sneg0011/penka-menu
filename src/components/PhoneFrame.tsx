import type { ReactNode } from "react";

/**
 * Рамка телефона для просмотра с компьютера. От 768 px по ширине и от 600 px по высоте: телефон 390 × 844
 * (ниже окна — ниже экран) по центру спокойного фона, меню прокручивается внутри экрана, по краям — подпись
 * концепта. Уже 768 px или ниже 600 px (телефон «лёжа») — рамки нет, обычная страница. Переключение — только CSS (globals.css, `.pk-stage`),
 * без JS: сервер и браузер рисуют одно и то же. Экран помечен `data-scroll-root` — по нему
 * useSectionProgress понимает, что прокручивается: экран (в рамке) или страница.
 * `backdrop` — фон экрана (перелив разделов): лежит под экраном и не прокручивается вместе с меню —
 * на телефоне закреплён на окне, в рамке — на экране телефона.
 */
export function PhoneFrame({ children, backdrop }: { children: ReactNode; backdrop?: ReactNode }) {
  return (
    <div className="pk-stage">
      <div className="pk-stage-note pk-stage-note--start" aria-hidden="true">
        <p className="font-script text-[64px] leading-[0.9]">Пенка</p>
        <p className="mt-4 max-w-[22ch] text-[15px] leading-6">QR-меню для гостей за столом: состав, вкус и цена каждой позиции</p>
      </div>
      <div className="pk-stage-note pk-stage-note--end" aria-hidden="true">
        <p className="max-w-[24ch] text-[15px] leading-6">концепт AVA для „Пенки“</p>
        <p className="mt-1 max-w-[24ch] text-[15px] leading-6">меню листается внутри телефона</p>
      </div>
      <div className="pk-device">
        {backdrop}
        <div className="pk-screen" data-scroll-root="">
          {children}
        </div>
      </div>
    </div>
  );
}
