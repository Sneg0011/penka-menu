// Перелив фона между разделами — чистая часть: какие разделы лежат на слое, где их границы,
// где фронт жидкости и как всё это превращается в uniforms шейдера или в запасной CSS-градиент.
// Ни DOM, ни WebGL здесь нет: замеры делает PourBackground, рисует pourShader.

import { sections as allSections } from "@/content/sections";
import type { Section } from "@/content/types";
import { mixColor } from "@/lib/theme";

import type { SectionProgress } from "./useSectionProgress";

/** Граница двух соседних разделов на слое. Всё в CSS px от верха слоя (он же верх экрана). */
export type PourEdge = {
  /** Верх нижнего раздела. */
  y: number;
  /** Место без текста над границей (низ верхнего раздела) — фронт выше не заходит. */
  up: number;
  /** Место без текста под границей (до заголовка нижнего раздела) — фронт ниже не заходит. */
  down: number;
  /** Насколько перелив продвинулся: 0 — граница у низа окна, 1 — дошла до линии чтения. */
  tau: number;
};

/** Что лежит на слое: разделы сверху вниз (индексы в `sections`) и границы между соседними; `line` — линия чтения. */
export type PourStack = { ids: number[]; edges: PourEdge[]; line: number };

/** Больше четырёх разделов на экран телефона не помещается (самый короткий раздел выше 700 px). */
export const SLOTS = 4;
/** Граница «нигде» для пустых мест в uniforms: далеко ниже любого экрана. */
const FAR = 100_000;
/** Запас от текста, px: фронт не подходит к строкам ближе. */
const SAFE = 8;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const smoothstep = (a: number, b: number, x: number) => {
  const k = clamp01((x - a) / (b - a));
  return k * k * (3 - 2 * k);
};

/**
 * Разделы, которые могут быть видны при этом прогрессе: предыдущий (его граница — у шапки, перелив на ней
 * только что закончился), текущий, следующий и тот, что за ним (если следующий раздел короче экрана).
 */
export function pourSections(p: SectionProgress, count = allSections.length): number[] {
  const from = Math.max(0, p.index - 1);
  const to = Math.min(count - 1, p.index + 2);
  const ids: number[] = [];
  for (let i = from; i <= to; i++) ids.push(i);
  return ids;
}

/**
 * Граница по замерам: `y` — верх нижнего раздела, `upperText` — низ последнего текста над ней,
 * `lowerText` — верх первого текста под ней, `line` — линия чтения, `view` — высота окна прокрутки.
 */
export function edgeFrom(m: { y: number; upperText: number; lowerText: number; line: number; view: number }): PourEdge {
  const span = Math.max(1, m.view - m.line);
  return {
    y: m.y,
    up: Math.max(0, m.y - m.upperText - SAFE),
    down: Math.max(0, m.lowerText - m.y - SAFE),
    tau: Math.round(clamp01((m.view - m.y) / span) * 1000) / 1000,
  };
}

/**
 * Фронт жидкости относительно границы: `centre` — средняя линия (px, плюс — ниже границы), `reach` — насколько
 * завихрения отходят от неё в обе стороны. Пока граница поднимается от низа окна, нижняя жидкость вливается
 * под заголовок нового раздела и бурлит; ближе к шапке фронт поднимается над границей и успокаивается —
 * к τ = 1 перелив закончен, экран под шапкой целиком в цвете нового раздела. Фронт никогда не выходит
 * из места без текста: [−up, down].
 */
export function pourFront(e: PourEdge): { centre: number; reach: number } {
  const settle = smoothstep(0.3, 1, e.tau);
  const centre = lerp(0.42 * e.down, -0.55 * e.up, settle);
  const wanted = lerp(0.32 * (e.up + e.down), 0.3 * e.up, settle);
  const reach = Math.max(0, Math.min(wanted, centre + e.up, e.down - centre));
  return { centre, reach };
}

/**
 * Виден ли фронт между `top` (низ шапки) и `bottom` (низ экрана) — тогда жидкость стоит анимировать.
 * Прожилки шейдера отходят от средней линии фронта не дальше 1,6 размаха.
 */
export function frontVisible(e: PourEdge, top: number, bottom: number): boolean {
  const { centre, reach } = pourFront(e);
  return e.y + centre + 1.6 * reach > top && e.y + centre - 1.6 * reach < bottom;
}

/**
 * Тело раздела: доля второго цвета `bg` у верха и у низа слоя. Свет падает сверху: вверху почти чистый
 * первый цвет (как у шапки), к низу чуть гуще. Шейдер ещё мягко «мраморит» долю вокруг этого
 * значения, но не выходит из 0…1 — поэтому текст раздела читается везде (контраст проверен на обоих цветах).
 */
export const BODY = { top: 0.12, bottom: 0.34 } as const;

export function bodyShare(y: number, height: number): number {
  return lerp(BODY.top, BODY.bottom, height > 0 ? clamp01(y / height) : 0);
}

export function bodyColor(section: Section, y: number, height: number): string {
  return mixColor(section.bg[0], section.bg[1], bodyShare(y, height));
}

const rgb01 = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

/**
 * Uniforms шейдера: `colors` — 4 раздела × (bg0, bg1) × RGB 0…1 сверху вниз, пустые места повторяют последний;
 * `edges` — 3 границы × (y, up, down, τ), пустые — далеко внизу; `fronts` — 3 × (середина, размах, зерно).
 * Зерно шума — номер нижнего раздела: у каждой границы свой узор, и он не прыгает, когда сменяется текущий
 * раздел (граница переезжает в другое место массива).
 */
export function pourUniforms(stack: PourStack, list: Section[] = allSections) {
  const colors = new Float32Array(SLOTS * 6);
  const edges = new Float32Array((SLOTS - 1) * 4);
  const fronts = new Float32Array((SLOTS - 1) * 3);
  for (let i = 0; i < SLOTS; i++) {
    const s = list[stack.ids[Math.min(i, stack.ids.length - 1)]];
    colors.set([...rgb01(s.bg[0]), ...rgb01(s.bg[1])], i * 6);
  }
  for (let i = 0; i < SLOTS - 1; i++) {
    const e = stack.edges[i];
    if (!e) {
      edges.set([FAR, 0, 0, 0], i * 4);
      continue;
    }
    const f = pourFront(e);
    edges.set([e.y, e.up, e.down, e.tau], i * 4);
    fronts.set([f.centre, f.reach, stack.ids[i + 1]], i * 3);
  }
  return { colors, edges, fronts };
}

/**
 * Сторож видеокарты. `samples` — сколько интервалов кадров собрать для решения, `budgetMs` — средний интервал,
 * выше которого перелив тормозит прокрутку (шапка и карусель живут в том же кадре), `hitches` — доля самых
 * длинных интервалов, которые не считаются: одна-три заминки (сборка мусора, вкладка вернулась в фокус)
 * не должны понижать качество.
 */
export const GPU_GUARD = { samples: 20, budgetMs: 22, hitches: 0.15 } as const;

/**
 * Ключ sessionStorage, где перелив запоминает вердикт сторожа на вкладку: `"css"` — видеокарта не тянет.
 * Его же читает 3D-стаканчик первого экрана (hero.ts): тогда он остаётся рисунком.
 */
export const POUR_SESSION_KEY = "pk-pour";

export type GpuVerdict = "keep" | "lower-dpr" | "css";

/**
 * Что делать с шейдером по интервалам между кадрами (мс), пока он рисует фронт. Мало замеров — «keep»
 * (решать рано). Средний интервал без заминок в бюджете — «keep»; иначе «lower-dpr», а если DPR уже снижен
 * (`lowered`) — «css». Решение одностороннее: вызывающий не повышает качество обратно.
 */
export function gpuVerdict(deltas: number[], lowered = false): GpuVerdict {
  const valid = deltas.filter((d) => Number.isFinite(d) && d > 0).sort((a, b) => a - b);
  if (valid.length < GPU_GUARD.samples) return "keep";
  const kept = valid.slice(0, valid.length - Math.ceil(valid.length * GPU_GUARD.hitches));
  const mean = kept.reduce((sum, d) => sum + d, 0) / kept.length;
  if (mean <= GPU_GUARD.budgetMs) return "keep";
  return lowered ? "css" : "lower-dpr";
}

/**
 * Опорные точки запасного градиента (без WebGL): тело каждого раздела, а на каждой границе — мягкая полоса
 * смеси цветов (линейный градиент между точками — та же смесь, что `mixColor`) с центром на фронте.
 * Полоса движется с прокруткой так же, как фронт шейдера, и не выходит из места без текста.
 */
export function gradientStops(stack: PourStack, height: number, list: Section[] = allSections): { color: string; at: number }[] {
  const h = Math.max(1, height);
  const at = (s: Section, y: number) => ({ color: bodyColor(s, y, h), at: Math.round(y * 10) / 10 });
  const secs = stack.ids.map((i) => list[i]);
  const stops = [at(secs[0], 0)];
  stack.edges.forEach((e, k) => {
    const { centre, reach } = pourFront(e);
    const half = Math.max(6, reach * 0.6);
    const from = Math.max(e.y - e.up, e.y + centre - half);
    const to = Math.max(from, Math.min(e.y + e.down, e.y + centre + half));
    stops.push(at(secs[k], from), at(secs[k + 1], to));
  });
  stops.push(at(secs[secs.length - 1], h));
  return stops;
}

export function pourGradient(stack: PourStack, height: number, list: Section[] = allSections): string {
  return `linear-gradient(180deg, ${gradientStops(stack, height, list)
    .map((s) => `${s.color} ${s.at}px`)
    .join(", ")})`;
}
