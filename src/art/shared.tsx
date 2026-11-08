import { useId } from "react";

// Общее для рисунков: координаты в viewBox 0…100, свет сверху-слева, детерминированный «случай».

export type Rand = () => number;

/** FNV-1a: строка → 32-битное число. */
export function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Генератор 0…1 от строки (mulberry32): одна и та же позиция — один и тот же рисунок. */
export function rand(seed: string): Rand {
  let a = hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Случайное в диапазоне [a, b). */
export const between = (r: Rand, a: number, b: number) => a + (b - a) * r();

/** Координаты — до десятых: в viewBox 0…100 этого хватает с запасом, а разметка короче. */
export const f = (n: number) => Math.round(n * 10) / 10;

/** Масштаб и прозрачность — до сотых. */
export const f2 = (n: number) => Math.round(n * 100) / 100;

type Point = [number, number];

/** Замкнутая гладкая кривая через точки (Catmull-Rom → кубические Безье). */
export function smoothClosed(points: Point[]): string {
  const n = points.length;
  let d = `M${f(points[0][0])},${f(points[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];
    const c1: Point = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Point = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`;
  }
  return d + "Z";
}

/** Мягкая неровная клякса вокруг (cx, cy): белок, соус, ложка сметаны. */
export function blob(r: Rand, cx: number, cy: number, rx: number, ry: number, n = 8, wobble = 0.14): string {
  const turn = r() * Math.PI * 2;
  const points: Point[] = [];
  for (let i = 0; i < n; i++) {
    const a = turn + (i / n) * Math.PI * 2;
    const k = 1 + (r() * 2 - 1) * wobble;
    points.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return smoothClosed(points);
}

/**
 * Ids для данных конкретного рисунка (градиенты слоёв напитка): на странице их десятки.
 * Всё неизменное лежит один раз в <ArtDefs /> с фиксированными id `pk-…`.
 */
export function useArtIds() {
  const base = "pk" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (name: string) => `${base}-${name}`;
}

/** Ссылка на общий спрайт `#pk-<id>` из <ArtDefs /> со сдвигом, поворотом и масштабом. */
export function Use({ id, x = 0, y = 0, rot = 0, s = 1 }: { id: string; x?: number; y?: number; rot?: number; s?: number }) {
  let t = "";
  if (x || y) t += `translate(${f(x)},${f(y)})`;
  if (rot) t += `rotate(${Math.round(rot)})`;
  if (s !== 1) t += `scale(${f2(s)})`;
  return <use href={`#pk-${id}`} transform={t || undefined} />;
}

/** Сдвиг, поворот и масштаб группы одной строкой. */
export function place(x: number, y: number, rot = 0, s = 1) {
  let t = `translate(${f(x)},${f(y)})`;
  if (rot) t += `rotate(${Math.round(rot)})`;
  if (s !== 1) t += `scale(${f2(s)})`;
  return t;
}

/**
 * Общее «зерно» рисунка: тёплые тёмные крапинки поверх фигур, только там, где есть краска.
 * Прозрачность стекла почти не меняется — крапинки слабые и обрезаны по альфе исходника.
 */
export function GrainFilter({ id }: { id: string }) {
  return (
    <filter id={id} x="0" y="0" width="100" height="100" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="2.4" numOctaves={2} seed={7} stitchTiles="stitch" result="noise" />
      <feColorMatrix
        in="noise"
        type="matrix"
        values="0 0 0 0 0.16  0 0 0 0 0.09  0 0 0 0 0.04  0.28 0 0 0 -0.11"
        result="specks"
      />
      <feComposite in="specks" in2="SourceGraphic" operator="in" result="grain" />
      <feMerge>
        <feMergeNode in="SourceGraphic" />
        <feMergeNode in="grain" />
      </feMerge>
    </filter>
  );
}

/** Общие свойства корневого svg. */
export function svgProps(size: number, className?: string) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 100 100",
    className,
    "aria-hidden": true,
  } as const;
}
