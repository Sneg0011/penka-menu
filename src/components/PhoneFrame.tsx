import type { ReactNode } from "react";

import { StageQr } from "./StageQr";

/**
 * Рамка телефона для просмотра с компьютера. От 768 px по ширине и от 600 px по высоте: телефон 390 × 844
 * (ниже окна — ниже экран) на тёмной кофейной сцене, меню прокручивается внутри экрана. От 1100 px по бокам —
 * крупное «Пенка» с объяснением слева и QR этой страницы справа (открыть меню на своём телефоне), снизу —
 * пометка концепта. Уже 768 px или ниже 600 px (телефон «лёжа») — рамки нет, обычная страница.
 * Переключение — только CSS (globals.css, `.pk-stage`), без JS: сервер и браузер рисуют одно и то же
 * (QR — единственное, что дорисовывается на клиенте). Экран помечен `data-scroll-root` — по нему
 * useSectionProgress понимает, что прокручивается: экран (в рамке) или страница.
 * `backdrop` — фон экрана (перелив разделов): лежит под экраном и не прокручивается вместе с меню —
 * на телефоне закреплён на окне, в рамке — на экране телефона.
 */
export function PhoneFrame({ children, backdrop }: { children: ReactNode; backdrop?: ReactNode }) {
  return (
    <div className="pk-stage">
      <div className="pk-stage-note pk-stage-note--start" aria-hidden="true">
        {/* крупное «Пенка меню» уже есть в телефоне — сбоку рукописная подпись и то, что это такое */}
        <p className="pk-stage-title font-script">Пенка</p>
        <p className="pk-stage-lead font-display font-extrabold">QR-меню для гостей за&nbsp;столом</p>
        <p className="pk-stage-text">Состав, вкус и цена каждой позиции, подбор напитка по привычке. Меню листается прямо в телефоне.</p>
      </div>
      <div className="pk-stage-note pk-stage-note--end" aria-hidden="true">
        <div className="pk-stage-qr">
          <StageQr />
        </div>
        <p className="pk-stage-text">Наведите камеру — меню откроется на&nbsp;вашем телефоне</p>
      </div>
      <p className="pk-stage-note pk-stage-note--foot" aria-hidden="true">
        Концепт AVA AGENCY для кофейни «Пенка». Неофициальный сайт.
      </p>
      <div className="pk-device">
        {backdrop}
        <div className="pk-screen" data-scroll-root="">
          {children}
        </div>
      </div>
    </div>
  );
}
