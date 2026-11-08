import { sections } from "@/content/sections";
import type { Section, SectionId } from "@/content/types";

/** Цвета и тон раздела по id. */
export function sectionTheme(id: SectionId): Section {
  const section = sections.find((s) => s.id === id);
  if (!section) throw new Error(`Нет раздела «${id}»`);
  return section;
}

type Rgb = [number, number, number];

/** `#rgb` или `#rrggbb` → каналы 0…255. */
function parseHex(color: string): Rgb {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!match) throw new Error(`Ожидался HEX-цвет (#rgb или #rrggbb), получено «${color}»`);
  const hex = match[1].length === 3 ? [...match[1]].map((c) => c + c).join("") : match[1];
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
}

const toHex = (channel: number) => Math.round(channel).toString(16).padStart(2, "0");

/** Смесь двух цветов: линейно по каналам sRGB, `t` зажат в 0…1 (0 — `a`, 1 — `b`). Результат — `#rrggbb` в нижнем регистре. */
export function mixColor(a: string, b: string, t: number): string {
  const k = Number.isNaN(t) ? 0 : Math.min(1, Math.max(0, t));
  const from = parseHex(a);
  const to = parseHex(b);
  return "#" + from.map((channel, i) => toHex(channel + (to[i] - channel) * k)).join("");
}

/** Относительная яркость по WCAG 2.x (0…1). */
function luminance(color: string): number {
  const [r, g, b] = parseHex(color).map((channel) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Контраст двух цветов по WCAG 2.x: от 1 (одинаковые) до 21 (чёрное на белом); порядок аргументов не важен. */
export function contrast(fg: string, bg: string): number {
  const [light, dark] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** Контраст, с которым считается приглушённый текст раздела: 4,5 по WCAG и запас на округление цветов. */
const MUTED_MIN = 4.6;

/**
 * Приглушённый цвет текста раздела (`--muted`): основной цвет текста, сдвинутый к середине фона настолько,
 * насколько позволяет контраст ≥ 4,5 : 1 на обоих цветах фона и на подложке чипа (8 % самого цвета поверх фона).
 * Если сдвинуть нельзя — основной цвет текста.
 */
export function mutedInk(section: Section): string {
  const middle = mixColor(section.bg[0], section.bg[1], 0.5);
  const ok = (color: string) =>
    section.bg.every((bg) => contrast(color, bg) >= MUTED_MIN && contrast(color, mixColor(bg, color, 0.08)) >= MUTED_MIN);
  for (let share = 0.4; share > 0; share -= 0.02) {
    const color = mixColor(section.ink, middle, share);
    if (ok(color)) return color;
  }
  return section.ink.toLowerCase();
}
