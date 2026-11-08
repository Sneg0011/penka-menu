// Стаканчик первого экрана — чистая часть: прогресс прокрутки первого экрана, поза стаканчика по прогрессу,
// решение «грузить ли 3D», рамка и профиль стаканчика (общие для SVG-рисунка и 3D-модели).
// Ни DOM, ни WebGL: замеры делает Cup3D, рисуют CupFallback (SVG) и Cup3D (three.js).

import { POUR_SESSION_KEY } from "./pour";

const clamp01 = (x: number) => (x > 0 ? (x < 1 ? x : 1) : 0);
const easeInOutSine = (t: number) => (1 - Math.cos(Math.PI * t)) / 2;
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const smoothstep = (a: number, b: number, x: number) => {
  const k = clamp01((x - a) / (b - a));
  return k * k * (3 - 2 * k);
};

/**
 * Хореография: `turnEnd` — доля прокрутки, за которую стаканчик делает ровно один оборот (надпись уходит
 * и возвращается к гостю); в оставшиеся ~20 % он приподнимается на `lift` мм и наклоняется на `tiltMax` (рад)
 * вперёд и вправо — `azimuth` (рад от направления на гостя к правому краю), а с середины наклона из прорези
 * крышки идёт короткая струя вниз — в стакан латте на обложке «Кофе» прямо под ним.
 * `yaw0` — с чего начинает: надпись чуть повёрнута (вид в три четверти, как на предметной съёмке).
 */
export const HERO = { turnEnd: 0.8, yaw0: -0.32, tiltMax: 0.6, azimuth: 0.26, lift: 14 } as const;

/**
 * Прогресс первого экрана, 0…1, по тому же окну прокрутки, что и useSectionProgress (страница на телефоне,
 * экран рамки на компьютере). `top` — верх рамки стаканчика от верха окна, `scrolled` — на сколько окно
 * прокручено, `line` — линия чтения (низ липкой шапки). 0 — страница в начале, 1 — верх рамки дошёл до
 * линии чтения: стаканчик целиком под шапкой, сразу под ним начинается меню.
 */
export function heroProgress({ top, scrolled, line }: { top: number; scrolled: number; line: number }): number {
  if (!(scrolled > 0)) return 0;
  const path = top + scrolled - line;
  if (!(path > 0)) return 1;
  return clamp01(scrolled / path);
}

/**
 * Хвост струи после конца первого экрана, 0…1: верх рамки ушёл выше линии чтения — налив закончен, остаток струи
 * падает вниз (за первые 10 % пути первого экрана). Без этого обрывок струи висел бы под шапкой у «Кофе».
 */
export function pourTail({ top, scrolled, line }: { top: number; scrolled: number; line: number }): number {
  const path = top + scrolled - line;
  if (!(path > 0) || !(scrolled > path)) return 0;
  return smoothstep(0, 0.1, (scrolled - path) / path);
}

/** Поза стаканчика: поворот вокруг оси (рад), наклон к гостю (рад), длина струи (0…1), подъём (мм). */
export type CupPose = { yaw: number; tilt: number; pour: number; lift: number };

/** Поза по прогрессу первого экрана. Монотонна: прокрутка назад проигрывает то же в обратную сторону. */
export function cupPose(progress: number): CupPose {
  const p = clamp01(Number.isFinite(progress) ? progress : 0);
  const turn = easeInOutSine(clamp01(p / HERO.turnEnd));
  const t = clamp01((p - HERO.turnEnd) / (1 - HERO.turnEnd));
  const tip = easeInOutCubic(t);
  return {
    yaw: HERO.yaw0 + 2 * Math.PI * turn,
    tilt: HERO.tiltMax * tip,
    pour: smoothstep(0.5, 0.92, t),
    lift: HERO.lift * tip,
  };
}

/** Вердикт сторожа перелива из sessionStorage; хранилище недоступно (приватный режим) или пусто — `null`. */
export function readPourVerdict(storage: () => Pick<Storage, "getItem"> | null | undefined): string | null {
  try {
    return storage()?.getItem(POUR_SESSION_KEY) ?? null;
  } catch {
    return null;
  }
}

/**
 * Как подменить SVG на 3D, когда сцена собрана: `"fade"` — растворением, только если рамка на экране и стаканчик
 * ещё в позе рисунка (начало прокрутки: поворот меньше ~4°, без наклона); иначе `"instant"` — сразу: поверх
 * неподвижного рисунка не проступает стаканчик в другой позе (двойная экспозиция). За экраном — тоже сразу.
 */
export function cupSwap(onScreen: boolean, progress: number): "fade" | "instant" {
  return onScreen && progress < 0.05 ? "fade" : "instant";
}

/**
 * Грузить ли 3D-стаканчик: устройство тянет (canUseRichMotion — WebGL2 с видеокартой, не «уменьшить движение»,
 * не экономия трафика, больше 4 ядер) и сторож перелива не решил на эту вкладку «css». Один источник правды
 * о видеокарте для перелива и стаканчика.
 */
export function shouldLoadCup3D(rich: boolean, verdict: string | null): boolean {
  return rich && verdict !== "css";
}

/**
 * Через сколько после `load` браться за 3D-стаканчик. Это украшение, а не содержимое: чанк three.js (~134 КБ gzip)
 * и сборка сцены (окружение PMREM, шейдеры) занимают главный поток на ~0,5 с даже на настольной видеокарте и на
 * телефоне дольше — первые секунды принадлежат самой странице (чтение, первые тапы и прокрутка), рисунок за
 * это время смотрится так же. После срока — как раньше: в свободное время, с растворением при покое.
 */
export const CUP_START_DELAY_MS = 4000;

// ───── Форма стаканчика ─────
// Картонный стаканчик ~350 мл в миллиметрах: донышко r 30, венчик r 44 на высоте 104, крышка до 118.
// Один профиль на оба рисунка: CupFallback проецирует его в SVG, Cup3D вытачивает (lathe) в three.js.

/** Радиус стенки на высоте y, мм: конус от донышка к венчику. */
export const wallRadius = (y: number) => 30 + (14 * (y - 1)) / 103;

/** Профили (r, y) в мм снизу вверх. Скругления — частыми точками: острых «чертёжных» кромок нет. */
export const CUP_PROFILE = {
  body: [
    [0, 2.4], [27.2, 2.4], [28.9, 1.6], [29.7, 0.5], [30.3, 0.15], [30.9, 0.8], [wallRadius(2.6), 2.6], [wallRadius(101.5), 101.5], [43.6, 102.2],
  ] as [number, number][],
  /** Гильза из крафта: от 30 до 78 мм, на 0,9 мм над стенкой, с подвёрнутыми кромками. */
  sleeve: [
    [wallRadius(29.4) + 0.1, 29.4], [wallRadius(29.7) + 0.7, 29.7], [wallRadius(30.2) + 0.95, 30.2],
    [wallRadius(77.8) + 0.95, 77.8], [wallRadius(78.3) + 0.7, 78.3], [wallRadius(78.6) + 0.1, 78.6],
  ] as [number, number][],
  /** Крышка: юбка, ступенька, кольцо с прорезью для питья, утопленный верх. */
  lid: [
    [43.2, 99.4], [46.4, 99.6], [47.3, 100.2], [47.7, 101.2], [47.7, 108], [47.4, 109.5], [46.8, 110.4], [45.9, 111],
    [45.5, 112.2], [45.1, 116], [44.6, 117.5], [43.6, 118.3], [42.2, 118.6], [40.8, 118.3], [39.9, 117.4], [39.4, 115.9],
    [38.9, 114.6], [38, 114], [36.2, 113.9], [20, 114.2], [0, 114.4],
  ] as [number, number][],
  height: 118.6,
};

/** Где на крышке прорезь для питья: на кольце, под этим углом от надписи (рад) — в конце оборота она в самой низкой точке наклона. */
export const SIP = { r: 42.2, y: 118.6, angle: HERO.azimuth - HERO.yaw0 } as const;

/**
 * Надпись на гильзе — своя, рукописная (Marck Script), не логотип кофейни. `arc` — длина надписи по окружности
 * гильзы, мм; `size` — кегль, мм; `baseline` — высота базовой линии от донышка, мм. Центр надписи — угол 0
 * стаканчика (к гостю, когда поворот равен 0). На обороте — `back`, мельче.
 */
export const LETTERING = { text: "Пенка", arc: 70, size: 29, baseline: 45, back: "Челябинск" } as const;

/**
 * Рамка стаканчика и вид в ней — общие для SVG и 3D, чтобы подмена шла без скачка; пропорции рамки на странице
 * Hero берёт отсюда же. `width × height` — единицы viewBox, `scale` — единиц на мм, `baseY` — где стоит донышко,
 * `layoutBottom` — где для вёрстки кончается рамка (ниже — только конец струи: он заходит под обложку «Кофе»
 * и наливает в стакан латте), `elevation` — камера чуть сверху (рад): видны эллипс крышки и прорезь.
 */
export const CUP_VIEW = { width: 300, height: 436, scale: 2.3, baseY: 352, layoutBottom: 383, elevation: 0.17 } as const;
